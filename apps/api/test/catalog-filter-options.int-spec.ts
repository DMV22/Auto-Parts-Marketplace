import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { FilterOptionsService } from '../src/catalog/filter-options/filter-options.service';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

const CAP = 100;
const SUPPLIER_ID = '7b000000-0000-4000-8000-000000000001';
const ACTIVE_BRAND_A_ID = '7b000000-0000-4000-8000-000000000010';
const ACTIVE_BRAND_B_ID = '7b000000-0000-4000-8000-000000000011';
const HIDDEN_BRAND_ID = '7b000000-0000-4000-8000-000000000012';
const ACTIVE_CATEGORY_A_ID = '7b000000-0000-4000-8000-000000000020';
const ACTIVE_CATEGORY_B_ID = '7b000000-0000-4000-8000-000000000021';
const HIDDEN_CATEGORY_ID = '7b000000-0000-4000-8000-000000000022';

describe('Catalog filter options integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let service: FilterOptionsService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [FilterOptionsService],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    service = moduleRef.get(FilterOptionsService);
  });

  beforeEach(async () => {
    await cleanFixtures(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanFixtures(prisma);
    await moduleRef?.close();
  });

  it('returns deterministic ACTIVE-only filter vocabulary and price ranges', async () => {
    await createVocabularyFixtures(prisma);

    await expect(service.get()).resolves.toEqual({
      data: {
        brands: [
          { id: ACTIVE_BRAND_B_ID, name: 'Filter Options Alpha' },
          { id: ACTIVE_BRAND_A_ID, name: 'Filter Options Zeta' },
        ],
        categories: [
          { id: ACTIVE_CATEGORY_B_ID, name: 'Filter Options Brakes' },
          { id: ACTIVE_CATEGORY_A_ID, name: 'Filter Options Filters' },
        ],
        defaultCurrency: 'UAH',
        currencies: [
          { code: 'UAH', minimumPrice: '80', maximumPrice: '100' },
          { code: 'USD', minimumPrice: '10', maximumPrice: '10' },
        ],
      },
      meta: { truncated: false },
    });
  });

  it('caps collections and reports truncation', async () => {
    await createCapFixtures(prisma);

    const response = await service.get();

    expect(response.meta).toEqual({ truncated: true });
    expect(response.data.brands).toHaveLength(CAP);
    expect(response.data.brands[0]).toEqual({
      id: capId('brand', 0),
      name: 'Filter Cap Brand 000',
    });
    expect(response.data.brands.at(-1)).toEqual({
      id: capId('brand', 99),
      name: 'Filter Cap Brand 099',
    });
  });
});

async function createVocabularyFixtures(prisma: PrismaService): Promise<void> {
  await prisma.supplier.create({
    data: {
      id: SUPPLIER_ID,
      name: 'Filter Options Supplier',
      slug: 'filter-options-supplier',
    },
  });
  await prisma.brand.createMany({
    data: [
      { id: ACTIVE_BRAND_A_ID, name: 'Filter Options Zeta' },
      { id: ACTIVE_BRAND_B_ID, name: 'Filter Options Alpha' },
      { id: HIDDEN_BRAND_ID, name: 'Filter Options Hidden' },
    ],
  });
  await prisma.category.createMany({
    data: [
      { id: ACTIVE_CATEGORY_A_ID, name: 'Filter Options Filters' },
      { id: ACTIVE_CATEGORY_B_ID, name: 'Filter Options Brakes' },
      { id: HIDDEN_CATEGORY_ID, name: 'Filter Options Hidden Category' },
    ],
  });

  await createProduct(prisma, {
    index: 1,
    brandId: ACTIVE_BRAND_A_ID,
    categoryId: ACTIVE_CATEGORY_A_ID,
    listings: [
      { status: 'ACTIVE', price: 100, currency: 'UAH', stockQuantity: 5 },
      { status: 'ACTIVE', price: 80, currency: 'UAH', stockQuantity: 0 },
      { status: 'DRAFT', price: 1, currency: 'UAH', stockQuantity: 5 },
    ],
  });
  await createProduct(prisma, {
    index: 2,
    brandId: ACTIVE_BRAND_B_ID,
    categoryId: ACTIVE_CATEGORY_B_ID,
    listings: [
      { status: 'ACTIVE', price: 10, currency: 'USD', stockQuantity: 2 },
    ],
  });
  await createProduct(prisma, {
    index: 3,
    brandId: HIDDEN_BRAND_ID,
    categoryId: HIDDEN_CATEGORY_ID,
    listings: [
      { status: 'PAUSED', price: 2, currency: 'EUR', stockQuantity: 4 },
    ],
  });
}

async function createCapFixtures(prisma: PrismaService): Promise<void> {
  await prisma.supplier.create({
    data: {
      id: SUPPLIER_ID,
      name: 'Filter Options Supplier',
      slug: 'filter-options-supplier',
    },
  });
  const indexes = Array.from({ length: CAP + 1 }, (_, index) => index);
  await prisma.brand.createMany({
    data: indexes.map((index) => ({
      id: capId('brand', index),
      name: `Filter Cap Brand ${index.toString().padStart(3, '0')}`,
    })),
  });
  await prisma.product.createMany({
    data: indexes.map((index) => ({
      id: capId('product', index),
      name: `Filter Cap Product ${index}`,
      brandId: capId('brand', index),
    })),
  });
  await prisma.productVariant.createMany({
    data: indexes.map((index) => ({
      id: capId('variant', index),
      productId: capId('product', index),
      sku: `FILTER-CAP-SKU-${index}`,
      manufacturerPartNumber: `FILTER-CAP-MPN-${index}`,
    })),
  });
  await prisma.listing.createMany({
    data: indexes.map((index) => ({
      id: capId('listing', index),
      supplierId: SUPPLIER_ID,
      productVariantId: capId('variant', index),
      status: 'ACTIVE',
      condition: 'NEW',
      price: index + 1,
      currency: 'UAH',
      stockQuantity: 0,
    })),
  });
}

async function createProduct(
  prisma: PrismaService,
  input: {
    index: number;
    brandId: string;
    categoryId: string;
    listings: Array<{
      status: 'ACTIVE' | 'DRAFT' | 'PAUSED';
      price: number;
      currency: string;
      stockQuantity: number;
    }>;
  },
): Promise<void> {
  await prisma.product.create({
    data: {
      id: vocabularyId('product', input.index),
      name: `Filter Options Product ${input.index}`,
      brandId: input.brandId,
      categoryId: input.categoryId,
      variants: {
        create: {
          id: vocabularyId('variant', input.index),
          sku: `FILTER-OPTIONS-SKU-${input.index}`,
          manufacturerPartNumber: `FILTER-OPTIONS-MPN-${input.index}`,
          listings: {
            create: input.listings.map((listing) => ({
              supplierId: SUPPLIER_ID,
              condition: 'NEW',
              ...listing,
            })),
          },
        },
      },
    },
  });
}

async function cleanFixtures(prisma: PrismaService): Promise<void> {
  await prisma.listing.deleteMany({ where: { supplierId: SUPPLIER_ID } });
  await prisma.product.deleteMany({
    where: { name: { startsWith: 'Filter Options Product' } },
  });
  await prisma.product.deleteMany({
    where: { name: { startsWith: 'Filter Cap Product' } },
  });
  await prisma.supplier.deleteMany({ where: { id: SUPPLIER_ID } });
  await prisma.category.deleteMany({
    where: { name: { startsWith: 'Filter Options' } },
  });
  await prisma.brand.deleteMany({
    where: {
      OR: [
        { name: { startsWith: 'Filter Options' } },
        { name: { startsWith: 'Filter Cap Brand' } },
      ],
    },
  });
}

function vocabularyId(kind: 'product' | 'variant', index: number): string {
  const prefix = kind === 'product' ? '7b100000' : '7b200000';
  return `${prefix}-0000-4000-8000-${index.toString().padStart(12, '0')}`;
}

function capId(
  kind: 'brand' | 'product' | 'variant' | 'listing',
  index: number,
): string {
  const prefix = {
    brand: '7b300000',
    product: '7b400000',
    variant: '7b500000',
    listing: '7b600000',
  }[kind];
  return `${prefix}-0000-4000-8000-${index.toString().padStart(12, '0')}`;
}
