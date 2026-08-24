import 'dotenv/config';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupplierMembershipService } from '../src/auth/supplier-membership/supplier-membership.service';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { SupplierProductVariantsService } from '../src/supplier-cabinet/product-variants/product-variants.service';
import type { SupplierProductVariantsQuery } from '../src/supplier-cabinet/product-variants/product-variants.types';

const BRAND_ID = '9a000000-0000-4000-8000-000000000001';
const CATEGORY_ID = '9a000000-0000-4000-8000-000000000002';
const PRODUCT_A_ID = '9a000000-0000-4000-8000-000000000003';
const PRODUCT_B_ID = '9a000000-0000-4000-8000-000000000004';
const VARIANT_A_ID = '9a000000-0000-4000-8000-000000000005';
const VARIANT_B_ID = '9a000000-0000-4000-8000-000000000006';
const VARIANT_C_ID = '9a000000-0000-4000-8000-000000000007';
const SUPPLIER_ID = '9a000000-0000-4000-8000-000000000008';
const ACTIVE_USER_ID = '9a000000-0000-4000-8000-000000000009';
const DISABLED_USER_ID = '9a000000-0000-4000-8000-000000000010';
const NO_MEMBERSHIP_USER_ID = '9a000000-0000-4000-8000-000000000011';

const BASE_QUERY: SupplierProductVariantsQuery = {
  query: null,
  cursor: null,
  limit: 20,
};

describe('Supplier frontend prerequisites integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let memberships: SupplierMembershipService;
  let variants: SupplierProductVariantsService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [SupplierMembershipService, SupplierProductVariantsService],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    memberships = moduleRef.get(SupplierMembershipService);
    variants = moduleRef.get(SupplierProductVariantsService);
  });

  beforeEach(async () => {
    await cleanFixtures(prisma);
    await createFixtures(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanFixtures(prisma);
    await moduleRef?.close();
  });

  it('returns active/inactive current membership or null without extra identity data', async () => {
    await expect(memberships.getCurrent(ACTIVE_USER_ID)).resolves.toEqual({
      data: {
        status: 'ACTIVE',
        supplier: {
          id: SUPPLIER_ID,
          name: 'Frontend prerequisite supplier',
          slug: 'frontend-prerequisite-supplier',
        },
      },
    });
    await expect(memberships.getCurrent(DISABLED_USER_ID)).resolves.toEqual({
      data: expect.objectContaining({ status: 'DISABLED' }),
    });
    await expect(
      memberships.getCurrent(NO_MEMBERSHIP_USER_ID),
    ).resolves.toEqual({ data: null });
  });

  it('searches canonical variants and returns only the supplier-safe projection', async () => {
    const response = await variants.list({
      ...BASE_QUERY,
      query: 'brake',
    });

    expect(response.data).toEqual([
      {
        id: VARIANT_A_ID,
        sku: 'BRAKE-A',
        manufacturerPartNumber: 'MPN-BRAKE-A',
        oemNumber: 'OEM-BRAKE-A',
        product: {
          id: PRODUCT_A_ID,
          name: 'Brake Pad',
          brand: { id: BRAND_ID, name: 'Prerequisite Bosch' },
          category: { id: CATEGORY_ID, name: 'Prerequisite Brakes' },
        },
      },
      expect.objectContaining({ id: VARIANT_B_ID, sku: 'BRAKE-B' }),
    ]);
    expect(response.pageInfo).toEqual({
      hasNextPage: false,
      nextCursor: null,
    });
    expect(response.data[0]).not.toHaveProperty('listings');
  });

  it('uses deterministic cursor pagination and non-disclosing missing detail', async () => {
    const first = await variants.list({ ...BASE_QUERY, limit: 1 });
    expect(first.data.map(({ id }) => id)).toEqual([VARIANT_C_ID]);
    expect(first.pageInfo.hasNextPage).toBe(true);
    expect(first.pageInfo.nextCursor).toEqual(expect.any(String));

    const cursor = JSON.parse(
      Buffer.from(first.pageInfo.nextCursor!, 'base64url').toString('utf8'),
    ) as SupplierProductVariantsQuery['cursor'];
    const second = await variants.list({ ...BASE_QUERY, limit: 1, cursor });
    expect(second.data.map(({ id }) => id)).toEqual([VARIANT_A_ID]);

    await expect(
      variants.detail('9a000000-0000-4000-8000-000000000099'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

async function createFixtures(prisma: PrismaService): Promise<void> {
  await prisma.brand.create({
    data: { id: BRAND_ID, name: 'Prerequisite Bosch' },
  });
  await prisma.category.create({
    data: { id: CATEGORY_ID, name: 'Prerequisite Brakes' },
  });
  await prisma.product.create({
    data: {
      id: PRODUCT_A_ID,
      name: 'Brake Pad',
      brandId: BRAND_ID,
      categoryId: CATEGORY_ID,
      variants: {
        create: [
          {
            id: VARIANT_A_ID,
            sku: 'BRAKE-A',
            manufacturerPartNumber: 'MPN-BRAKE-A',
            oemNumber: 'OEM-BRAKE-A',
          },
          {
            id: VARIANT_B_ID,
            sku: 'BRAKE-B',
            manufacturerPartNumber: 'MPN-BRAKE-B',
          },
        ],
      },
    },
  });
  await prisma.product.create({
    data: {
      id: PRODUCT_B_ID,
      name: 'Air Filter',
      brandId: BRAND_ID,
      variants: {
        create: {
          id: VARIANT_C_ID,
          sku: 'FILTER-A',
          manufacturerPartNumber: 'MPN-FILTER-A',
        },
      },
    },
  });
  await prisma.supplier.create({
    data: {
      id: SUPPLIER_ID,
      name: 'Frontend prerequisite supplier',
      slug: 'frontend-prerequisite-supplier',
    },
  });
  await prisma.user.createMany({
    data: [
      {
        id: ACTIVE_USER_ID,
        name: 'Active prerequisite user',
        email: 'g2-active-int@example.test',
        role: 'SUPPLIER_USER',
      },
      {
        id: DISABLED_USER_ID,
        name: 'Disabled prerequisite user',
        email: 'g2-disabled-int@example.test',
        role: 'SUPPLIER_USER',
      },
      {
        id: NO_MEMBERSHIP_USER_ID,
        name: 'No membership prerequisite user',
        email: 'g2-none-int@example.test',
        role: 'CUSTOMER',
      },
    ],
  });
  await prisma.supplierUser.createMany({
    data: [
      {
        userId: ACTIVE_USER_ID,
        supplierId: SUPPLIER_ID,
        status: 'ACTIVE',
      },
      {
        userId: DISABLED_USER_ID,
        supplierId: SUPPLIER_ID,
        status: 'DISABLED',
      },
    ],
  });
}

async function cleanFixtures(prisma: PrismaService): Promise<void> {
  await prisma.supplierUser.deleteMany({
    where: {
      userId: {
        in: [ACTIVE_USER_ID, DISABLED_USER_ID, NO_MEMBERSHIP_USER_ID],
      },
    },
  });
  await prisma.user.deleteMany({
    where: {
      id: { in: [ACTIVE_USER_ID, DISABLED_USER_ID, NO_MEMBERSHIP_USER_ID] },
    },
  });
  await prisma.supplier.deleteMany({ where: { id: SUPPLIER_ID } });
  await prisma.product.deleteMany({
    where: { id: { in: [PRODUCT_A_ID, PRODUCT_B_ID] } },
  });
  await prisma.category.deleteMany({ where: { id: CATEGORY_ID } });
  await prisma.brand.deleteMany({ where: { id: BRAND_ID } });
}
