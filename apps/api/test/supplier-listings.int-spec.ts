import 'dotenv/config';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { SupplierListingsService } from '../src/supplier-cabinet/listings/listings.service';
import type { SupplierListingsQuery } from '../src/supplier-cabinet/listings/listings.types';

const BRAND_ID = '91000000-0000-4000-8000-000000000001';
const PRODUCT_ID = '91000000-0000-4000-8000-000000000002';
const VARIANT_A_ID = '91000000-0000-4000-8000-000000000003';
const VARIANT_B_ID = '91000000-0000-4000-8000-000000000004';
const SUPPLIER_A_ID = '91000000-0000-4000-8000-000000000005';
const SUPPLIER_B_ID = '91000000-0000-4000-8000-000000000006';
const LISTING_A_ID = '91000000-0000-4000-8000-000000000010';
const LISTING_B_ID = '91000000-0000-4000-8000-000000000011';
const FOREIGN_LISTING_ID = '91000000-0000-4000-8000-000000000012';

const BASE_QUERY: SupplierListingsQuery = {
  status: null,
  condition: null,
  productVariantId: null,
  cursor: null,
  pageSize: 20,
  sort: 'updated_desc',
};

describe('SupplierListingsService integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let service: SupplierListingsService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [SupplierListingsService],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    service = moduleRef.get(SupplierListingsService);
  });

  beforeEach(async () => {
    await cleanFixtures(prisma);
    await createFixtures(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanFixtures(prisma);
    await moduleRef?.close();
  });

  it('creates a draft with zero stock and updates only editable fields', async () => {
    const created = await service.create(SUPPLIER_A_ID, {
      productVariantId: VARIANT_B_ID,
      condition: 'REMANUFACTURED',
      price: '450.25',
      currency: 'UAH',
    });

    expect(created).toMatchObject({
      supplierId: SUPPLIER_A_ID,
      productVariant: { id: VARIANT_B_ID },
      status: 'DRAFT',
      condition: 'REMANUFACTURED',
      price: '450.25',
      currency: 'UAH',
      stockQuantity: 0,
    });

    await expect(
      service.update(SUPPLIER_A_ID, created.id, {
        condition: 'USED',
        price: '399.99',
      }),
    ).resolves.toMatchObject({
      id: created.id,
      condition: 'USED',
      price: '399.99',
      status: 'DRAFT',
      stockQuantity: 0,
    });
  });

  it('scopes detail and update by supplier and protects non-editable states', async () => {
    await expect(
      service.get(SUPPLIER_A_ID, FOREIGN_LISTING_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.update(SUPPLIER_A_ID, FOREIGN_LISTING_ID, { price: '10.00' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    await prisma.listing.update({
      where: { id: LISTING_A_ID },
      data: { status: 'PENDING_APPROVAL' },
    });
    await expect(
      service.update(SUPPLIER_A_ID, LISTING_A_ID, { price: '10.00' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('uses stable cursor pagination and supplier-owned filters', async () => {
    const first = await service.list(SUPPLIER_A_ID, {
      ...BASE_QUERY,
      pageSize: 1,
      sort: 'price_asc',
      condition: 'NEW',
    });
    expect(first.data.map(({ id }) => id)).toEqual([LISTING_A_ID]);
    expect(first.meta.nextCursor).toEqual(expect.any(String));

    const cursor = JSON.parse(
      Buffer.from(first.meta.nextCursor!, 'base64url').toString('utf8'),
    ) as SupplierListingsQuery['cursor'];
    const second = await service.list(SUPPLIER_A_ID, {
      ...BASE_QUERY,
      pageSize: 1,
      sort: 'price_asc',
      condition: 'NEW',
      cursor,
    });
    expect(second.data.map(({ id }) => id)).toEqual([LISTING_B_ID]);
    expect(second.data).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: FOREIGN_LISTING_ID }),
      ]),
    );
  });

  it('rejects a missing ProductVariant without creating a Listing', async () => {
    const before = await prisma.listing.count({
      where: { supplierId: SUPPLIER_A_ID },
    });
    await expect(
      service.create(SUPPLIER_A_ID, {
        productVariantId: '91000000-0000-4000-8000-000000000099',
        condition: 'NEW',
        price: '100.00',
        currency: 'UAH',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      prisma.listing.count({ where: { supplierId: SUPPLIER_A_ID } }),
    ).resolves.toBe(before);
  });

  it('persists rejection metadata and clears it across resubmit and approval', async () => {
    await expect(
      service.transitionSupplierListing(SUPPLIER_A_ID, LISTING_A_ID, 'submit'),
    ).resolves.toMatchObject({
      status: 'PENDING_APPROVAL',
      rejectionReason: null,
    });
    await expect(
      service.transitionAdminListing(
        LISTING_A_ID,
        'reject',
        'Missing manufacturer evidence',
      ),
    ).resolves.toMatchObject({
      status: 'REJECTED',
      rejectionReason: 'Missing manufacturer evidence',
    });
    await expect(
      service.update(SUPPLIER_A_ID, LISTING_A_ID, { price: '125.00' }),
    ).resolves.toMatchObject({
      status: 'REJECTED',
      price: '125',
      rejectionReason: 'Missing manufacturer evidence',
    });
    await expect(
      service.transitionSupplierListing(SUPPLIER_A_ID, LISTING_A_ID, 'submit'),
    ).resolves.toMatchObject({
      status: 'PENDING_APPROVAL',
      rejectionReason: null,
    });
    await expect(
      service.transitionAdminListing(LISTING_A_ID, 'approve'),
    ).resolves.toMatchObject({ status: 'ACTIVE', rejectionReason: null });
  });

  it('applies approval-sensitive edits and terminal archive transitions', async () => {
    await prisma.listing.update({
      where: { id: LISTING_A_ID },
      data: { status: 'ACTIVE' },
    });
    await expect(
      service.update(SUPPLIER_A_ID, LISTING_A_ID, { price: '110.00' }),
    ).resolves.toMatchObject({ status: 'ACTIVE', price: '110' });
    await expect(
      service.transitionSupplierListing(SUPPLIER_A_ID, LISTING_A_ID, 'pause'),
    ).resolves.toMatchObject({ status: 'PAUSED' });
    await expect(
      service.transitionSupplierListing(SUPPLIER_A_ID, LISTING_A_ID, 'resume'),
    ).resolves.toMatchObject({ status: 'ACTIVE' });
    await expect(
      service.update(SUPPLIER_A_ID, LISTING_A_ID, { currency: 'USD' }),
    ).resolves.toMatchObject({ status: 'PENDING_APPROVAL', currency: 'USD' });
    await expect(
      service.transitionSupplierListing(SUPPLIER_A_ID, LISTING_A_ID, 'archive'),
    ).resolves.toMatchObject({ status: 'ARCHIVED' });
    await expect(
      service.transitionSupplierListing(SUPPLIER_A_ID, LISTING_A_ID, 'archive'),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.update(SUPPLIER_A_ID, LISTING_A_ID, { price: '1.00' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

async function createFixtures(prisma: PrismaService): Promise<void> {
  await prisma.brand.create({
    data: { id: BRAND_ID, name: 'Supplier Listings Integration Brand' },
  });
  await prisma.product.create({
    data: {
      id: PRODUCT_ID,
      name: 'Supplier Listings Integration Product',
      brandId: BRAND_ID,
      variants: {
        create: [
          {
            id: VARIANT_A_ID,
            sku: 'SUP-INT-A',
            manufacturerPartNumber: 'SUP-INT-MPN-A',
          },
          {
            id: VARIANT_B_ID,
            sku: 'SUP-INT-B',
            manufacturerPartNumber: 'SUP-INT-MPN-B',
          },
        ],
      },
    },
  });
  await prisma.supplier.createMany({
    data: [
      {
        id: SUPPLIER_A_ID,
        name: 'Supplier Listings Integration A',
        slug: 'supplier-listings-integration-a',
      },
      {
        id: SUPPLIER_B_ID,
        name: 'Supplier Listings Integration B',
        slug: 'supplier-listings-integration-b',
      },
    ],
  });
  await prisma.listing.createMany({
    data: [
      {
        id: LISTING_A_ID,
        supplierId: SUPPLIER_A_ID,
        productVariantId: VARIANT_A_ID,
        condition: 'NEW',
        price: 100,
        currency: 'UAH',
      },
      {
        id: LISTING_B_ID,
        supplierId: SUPPLIER_A_ID,
        productVariantId: VARIANT_B_ID,
        condition: 'NEW',
        price: 100,
        currency: 'UAH',
      },
      {
        id: FOREIGN_LISTING_ID,
        supplierId: SUPPLIER_B_ID,
        productVariantId: VARIANT_A_ID,
        condition: 'NEW',
        price: 50,
        currency: 'UAH',
      },
    ],
  });
}

async function cleanFixtures(prisma: PrismaService): Promise<void> {
  await prisma.listing.deleteMany({
    where: { supplierId: { in: [SUPPLIER_A_ID, SUPPLIER_B_ID] } },
  });
  await prisma.supplier.deleteMany({
    where: { id: { in: [SUPPLIER_A_ID, SUPPLIER_B_ID] } },
  });
  await prisma.product.deleteMany({ where: { id: PRODUCT_ID } });
  await prisma.brand.deleteMany({ where: { id: BRAND_ID } });
}
