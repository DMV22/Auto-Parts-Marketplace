import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CatalogService } from '../src/catalog/catalog.service';
import type { CatalogQuery } from '../src/catalog/catalog.types';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

const MAKE_ID = '78000000-0000-4000-8000-000000000001';
const GENERATION_ID = '78000000-0000-4000-8000-000000000003';
const ENGINE_ID = '78000000-0000-4000-8000-000000000004';
const BRAND_A_ID = '78000000-0000-4000-8000-000000000010';
const BRAND_B_ID = '78000000-0000-4000-8000-000000000011';
const CATEGORY_A_ID = '78000000-0000-4000-8000-000000000012';
const CATEGORY_B_ID = '78000000-0000-4000-8000-000000000013';
const SUPPLIER_ID = '78000000-0000-4000-8000-000000000014';
const PRODUCT_A_ID = '78000000-0000-4000-8000-000000000020';
const PRODUCT_B_ID = '78000000-0000-4000-8000-000000000021';
const HIDDEN_PRODUCT_ID = '78000000-0000-4000-8000-000000000022';
const VARIANT_A_ID = '78000000-0000-4000-8000-000000000030';
const VARIANT_A2_ID = '78000000-0000-4000-8000-000000000031';
const OWNER_ID = '78000000-0000-4000-8000-000000000040';
const OTHER_USER_ID = '78000000-0000-4000-8000-000000000041';

const BASE_QUERY: CatalogQuery = {
  q: null,
  categoryId: null,
  brandId: null,
  minPrice: null,
  maxPrice: null,
  currency: null,
  inStock: null,
  condition: null,
  year: null,
  generationId: null,
  engineTypeId: null,
  savedVehicleId: null,
  page: 1,
  pageSize: 20,
  sort: 'name_asc',
};

describe('CatalogService integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let service: CatalogService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [CatalogService],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    service = moduleRef.get(CatalogService);
  });

  beforeEach(async () => {
    await cleanFixtures(prisma);
    await createFixtures(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanFixtures(prisma);
    await moduleRef?.close();
  });

  it('returns product-centric results with only active listings', async () => {
    const response = await service.list(BASE_QUERY, null);

    expect(response.meta).toEqual({
      page: 1,
      pageSize: 20,
      total: 2,
      totalPages: 1,
      sort: 'name_asc',
    });
    expect(response.data.map(({ id }) => id)).toEqual([
      PRODUCT_A_ID,
      PRODUCT_B_ID,
    ]);
    expect(response.data[0].variants).toHaveLength(2);
    expect(
      response.data.flatMap(({ variants }) =>
        variants.flatMap(({ listings }) => listings),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ condition: 'NEW', inStock: true }),
        expect.objectContaining({ condition: 'USED', inStock: false }),
      ]),
    );
    expect(response.data.some(({ id }) => id === HIDDEN_PRODUCT_ID)).toBe(
      false,
    );
  });

  it('searches variant identifiers and applies commercial filters to projection', async () => {
    const response = await service.list(
      {
        ...BASE_QUERY,
        q: 'MPN-BRAKE-100',
        condition: 'USED',
        currency: 'UAH',
        inStock: false,
      },
      null,
    );

    expect(response.meta.total).toBe(1);
    expect(response.data).toEqual([
      expect.objectContaining({
        id: PRODUCT_A_ID,
        minimumPrice: { amount: '80', currency: 'UAH' },
        variants: [
          expect.objectContaining({
            id: VARIANT_A_ID,
            listings: [
              expect.objectContaining({
                condition: 'USED',
                price: '80',
                inStock: false,
              }),
            ],
          }),
        ],
      }),
    ]);
  });

  it('paginates products by minimum active listing price with stable totals', async () => {
    const first = await service.list(
      {
        ...BASE_QUERY,
        currency: 'UAH',
        sort: 'price_asc',
        pageSize: 1,
      },
      null,
    );
    const second = await service.list(
      {
        ...BASE_QUERY,
        currency: 'UAH',
        sort: 'price_asc',
        page: 2,
        pageSize: 1,
      },
      null,
    );

    expect(first.meta).toMatchObject({ total: 2, totalPages: 2 });
    expect(first.data).toEqual([
      expect.objectContaining({
        id: PRODUCT_B_ID,
        minimumPrice: { amount: '50', currency: 'UAH' },
      }),
    ]);
    expect(second.data).toEqual([
      expect.objectContaining({
        id: PRODUCT_A_ID,
        minimumPrice: { amount: '80', currency: 'UAH' },
      }),
    ]);
  });

  it('combines category, brand, price, stock and condition filters in PostgreSQL', async () => {
    const response = await service.list(
      {
        ...BASE_QUERY,
        categoryId: CATEGORY_A_ID,
        brandId: BRAND_A_ID,
        currency: 'UAH',
        minPrice: '90',
        maxPrice: '110',
        inStock: true,
        condition: 'NEW',
      },
      null,
    );

    expect(response.meta.total).toBe(1);
    expect(response.data).toEqual([
      expect.objectContaining({
        id: PRODUCT_A_ID,
        minimumPrice: { amount: '100', currency: 'UAH' },
        variants: [
          expect.objectContaining({
            id: VARIANT_A_ID,
            listings: [expect.objectContaining({ price: '100' })],
          }),
        ],
      }),
    ]);

    await expect(
      service.list({ ...BASE_QUERY, q: 'Catalog Integration Beta' }, null),
    ).resolves.toMatchObject({ data: [{ id: PRODUCT_B_ID }] });
    await expect(
      service.list({ ...BASE_QUERY, currency: 'UAH', maxPrice: '40' }, null),
    ).resolves.toMatchObject({ data: [], meta: { total: 0, totalPages: 0 } });
  });

  it('filters by explicit or owned saved vehicle without treating missing rules as compatible', async () => {
    const explicit = await service.list(
      {
        ...BASE_QUERY,
        year: 2020,
        generationId: GENERATION_ID,
        engineTypeId: ENGINE_ID,
      },
      null,
    );
    expect(explicit.data.map(({ id }) => id)).toEqual([PRODUCT_A_ID]);
    expect(explicit.data[0].variants.map(({ id }) => id)).toEqual([
      VARIANT_A_ID,
      VARIANT_A2_ID,
    ]);

    const saved = await prisma.savedVehicle.create({
      data: {
        userId: OWNER_ID,
        year: 2020,
        vehicleGenerationId: GENERATION_ID,
        engineTypeId: ENGINE_ID,
      },
    });
    await expect(
      service.list({ ...BASE_QUERY, savedVehicleId: saved.id }, OWNER_ID),
    ).resolves.toMatchObject({ data: [{ id: PRODUCT_A_ID }] });
    await expect(
      service.list({ ...BASE_QUERY, savedVehicleId: saved.id }, OTHER_USER_ID),
    ).rejects.toThrow('Saved vehicle not found');
    await expect(
      service.list({ ...BASE_QUERY, savedVehicleId: saved.id }, null),
    ).rejects.toThrow('Authentication required for savedVehicleId');
    await expect(
      service.list(
        { ...BASE_QUERY, year: 2022, generationId: GENERATION_ID },
        null,
      ),
    ).rejects.toThrow('Year is outside the vehicle generation range');
  });
});

async function createFixtures(prisma: PrismaService): Promise<void> {
  await prisma.user.createMany({
    data: [
      {
        id: OWNER_ID,
        name: 'Catalog Owner',
        email: 'catalog-owner@example.test',
      },
      {
        id: OTHER_USER_ID,
        name: 'Catalog Other',
        email: 'catalog-other@example.test',
      },
    ],
  });
  await prisma.vehicleMake.create({
    data: {
      id: MAKE_ID,
      name: 'Catalog Integration Make',
      models: {
        create: {
          name: 'Catalog Integration Model',
          generations: {
            create: {
              id: GENERATION_ID,
              code: 'CATALOG-GEN',
              yearFrom: 2019,
              yearTo: 2021,
              engineTypes: {
                create: {
                  id: ENGINE_ID,
                  code: 'CATALOG-ENGINE',
                  name: 'Catalog Engine',
                },
              },
            },
          },
        },
      },
    },
  });
  await prisma.category.createMany({
    data: [
      { id: CATEGORY_A_ID, name: 'Catalog Integration Brakes' },
      { id: CATEGORY_B_ID, name: 'Catalog Integration Filters' },
    ],
  });
  await prisma.brand.createMany({
    data: [
      { id: BRAND_A_ID, name: 'Catalog Integration Alpha' },
      { id: BRAND_B_ID, name: 'Catalog Integration Beta' },
    ],
  });
  await prisma.supplier.create({
    data: {
      id: SUPPLIER_ID,
      name: 'Catalog Integration Supplier',
      slug: 'catalog-integration-supplier',
    },
  });
  await prisma.product.create({
    data: {
      id: PRODUCT_A_ID,
      name: 'Brake Pad Set',
      description: 'Front axle ceramic pads',
      brandId: BRAND_A_ID,
      categoryId: CATEGORY_A_ID,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      variants: {
        create: [
          {
            id: VARIANT_A_ID,
            sku: 'CAT-BRAKE-100',
            manufacturerPartNumber: 'MPN-BRAKE-100',
            oemNumber: 'OEM-BRAKE-100',
            fitmentRules: {
              create: {
                vehicleGenerationId: GENERATION_ID,
                engineTypeId: ENGINE_ID,
              },
            },
            listings: {
              create: [
                {
                  supplierId: SUPPLIER_ID,
                  status: 'ACTIVE',
                  condition: 'NEW',
                  price: 100,
                  currency: 'UAH',
                  stockQuantity: 10,
                },
                {
                  supplierId: SUPPLIER_ID,
                  status: 'ACTIVE',
                  condition: 'USED',
                  price: 80,
                  currency: 'UAH',
                  stockQuantity: 0,
                },
                {
                  supplierId: SUPPLIER_ID,
                  status: 'DRAFT',
                  condition: 'NEW',
                  price: 1,
                  currency: 'UAH',
                  stockQuantity: 10,
                },
              ],
            },
          },
          {
            id: VARIANT_A2_ID,
            sku: 'CAT-BRAKE-200',
            manufacturerPartNumber: 'MPN-BRAKE-200',
            fitmentRules: { create: { vehicleGenerationId: GENERATION_ID } },
            listings: {
              create: {
                supplierId: SUPPLIER_ID,
                status: 'ACTIVE',
                condition: 'REMANUFACTURED',
                price: 120,
                currency: 'UAH',
                stockQuantity: 5,
              },
            },
          },
        ],
      },
    },
  });
  await prisma.product.create({
    data: {
      id: PRODUCT_B_ID,
      name: 'Oil Filter',
      brandId: BRAND_B_ID,
      categoryId: CATEGORY_B_ID,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      variants: {
        create: {
          sku: 'CAT-FILTER-100',
          manufacturerPartNumber: 'MPN-FILTER-100',
          listings: {
            create: {
              supplierId: SUPPLIER_ID,
              status: 'ACTIVE',
              condition: 'NEW',
              price: 50,
              currency: 'UAH',
              stockQuantity: 3,
            },
          },
        },
      },
    },
  });
  await prisma.product.create({
    data: {
      id: HIDDEN_PRODUCT_ID,
      name: 'Hidden Product',
      brandId: BRAND_A_ID,
      variants: {
        create: {
          sku: 'CAT-HIDDEN-100',
          manufacturerPartNumber: 'MPN-HIDDEN-100',
          listings: {
            create: {
              supplierId: SUPPLIER_ID,
              status: 'PAUSED',
              condition: 'NEW',
              price: 5,
              currency: 'UAH',
              stockQuantity: 3,
            },
          },
        },
      },
    },
  });
}

async function cleanFixtures(prisma: PrismaService): Promise<void> {
  await prisma.listing.deleteMany({ where: { supplierId: SUPPLIER_ID } });
  await prisma.product.deleteMany({
    where: { id: { in: [PRODUCT_A_ID, PRODUCT_B_ID, HIDDEN_PRODUCT_ID] } },
  });
  await prisma.supplier.deleteMany({ where: { id: SUPPLIER_ID } });
  await prisma.category.deleteMany({
    where: { id: { in: [CATEGORY_A_ID, CATEGORY_B_ID] } },
  });
  await prisma.brand.deleteMany({
    where: { id: { in: [BRAND_A_ID, BRAND_B_ID] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [OWNER_ID, OTHER_USER_ID] } },
  });
  await prisma.vehicleMake.deleteMany({ where: { id: MAKE_ID } });
}
