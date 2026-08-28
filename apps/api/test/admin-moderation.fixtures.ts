import type { PrismaService } from '../src/prisma/prisma.service';

export const MODERATION_BRAND_ID = 'c4000000-0000-4000-8000-000000000001';
export const MODERATION_PRODUCT_ID = 'c4000000-0000-4000-8000-000000000002';
export const MODERATION_VARIANT_ID = 'c4000000-0000-4000-8000-000000000003';
export const MODERATION_SUPPLIER_ID = 'c4000000-0000-4000-8000-000000000004';
export const MODERATION_PENDING_A_ID = 'c4000000-0000-4000-8000-000000000010';
export const MODERATION_PENDING_B_ID = 'c4000000-0000-4000-8000-000000000011';
export const MODERATION_ACTIVE_ID = 'c4000000-0000-4000-8000-000000000012';
export const MODERATION_ADMIN_ID = 'c4000000-0000-4000-8000-000000000020';
export const MODERATION_SUPPORT_ID = 'c4000000-0000-4000-8000-000000000021';
export const MODERATION_OWNER_ID = 'c4000000-0000-4000-8000-000000000022';

export async function createAdminModerationFixtures(
  prisma: PrismaService,
  options: { createUsers?: boolean } = {},
): Promise<void> {
  await prisma.brand.create({
    data: { id: MODERATION_BRAND_ID, name: 'Admin Moderation Brand' },
  });
  await prisma.product.create({
    data: {
      id: MODERATION_PRODUCT_ID,
      name: 'Admin Moderation Brake Pad',
      brandId: MODERATION_BRAND_ID,
      variants: {
        create: {
          id: MODERATION_VARIANT_ID,
          sku: 'ADMIN-MOD-SKU',
          manufacturerPartNumber: 'ADMIN-MOD-MPN',
        },
      },
    },
  });
  await prisma.supplier.create({
    data: {
      id: MODERATION_SUPPLIER_ID,
      name: 'Admin Moderation Supplier',
      slug: 'admin-moderation-supplier',
    },
  });
  await prisma.listing.createMany({
    data: [
      listing(
        MODERATION_PENDING_A_ID,
        'PENDING_APPROVAL',
        100,
        new Date('2026-08-14T10:00:00.000Z'),
      ),
      listing(
        MODERATION_PENDING_B_ID,
        'PENDING_APPROVAL',
        110,
        new Date('2026-08-13T10:00:00.000Z'),
      ),
      listing(
        MODERATION_ACTIVE_ID,
        'ACTIVE',
        120,
        new Date('2026-08-12T10:00:00.000Z'),
      ),
    ],
  });
  if (options.createUsers ?? true) {
    await prisma.user.createMany({
      data: [
        {
          id: MODERATION_ADMIN_ID,
          name: 'Moderation Admin',
          email: 'admin@moderation.test',
          role: 'ADMIN',
          emailVerified: true,
        },
        {
          id: MODERATION_SUPPORT_ID,
          name: 'Moderation Support',
          email: 'support@moderation.test',
          role: 'SUPPORT_MANAGER',
          emailVerified: true,
        },
        {
          id: MODERATION_OWNER_ID,
          name: 'Moderation Supplier Owner',
          email: 'owner@moderation.test',
          role: 'SUPPLIER_USER',
          emailVerified: true,
        },
      ],
    });
    await prisma.supplierUser.create({
      data: {
        userId: MODERATION_OWNER_ID,
        supplierId: MODERATION_SUPPLIER_ID,
        status: 'ACTIVE',
      },
    });
  }
}

export async function cleanAdminModerationFixtures(
  prisma: PrismaService,
): Promise<void> {
  const listingIds = [
    MODERATION_PENDING_A_ID,
    MODERATION_PENDING_B_ID,
    MODERATION_ACTIVE_ID,
  ];
  await prisma.cartItem.deleteMany({
    where: { listingId: { in: listingIds } },
  });
  await prisma.activityLog.deleteMany({
    where: { resourceType: 'LISTING', resourceId: { in: listingIds } },
  });
  await prisma.supplierUser.deleteMany({
    where: { supplierId: MODERATION_SUPPLIER_ID },
  });
  await prisma.session.deleteMany({
    where: { user: { email: { endsWith: '@moderation.test' } } },
  });
  await prisma.account.deleteMany({
    where: { user: { email: { endsWith: '@moderation.test' } } },
  });
  await prisma.verification.deleteMany({
    where: { identifier: { endsWith: '@moderation.test' } },
  });
  await prisma.user.deleteMany({
    where: { email: { endsWith: '@moderation.test' } },
  });
  await prisma.listing.deleteMany({
    where: { supplierId: MODERATION_SUPPLIER_ID },
  });
  await prisma.supplier.deleteMany({
    where: { id: MODERATION_SUPPLIER_ID },
  });
  await prisma.product.deleteMany({ where: { id: MODERATION_PRODUCT_ID } });
  await prisma.brand.deleteMany({ where: { id: MODERATION_BRAND_ID } });
}

function listing(
  id: string,
  status: 'PENDING_APPROVAL' | 'ACTIVE',
  price: number,
  updatedAt: Date,
) {
  return {
    id,
    supplierId: MODERATION_SUPPLIER_ID,
    productVariantId: MODERATION_VARIANT_ID,
    status,
    condition: 'NEW' as const,
    price,
    currency: 'UAH',
    stockQuantity: 5,
    createdAt: updatedAt,
    updatedAt,
  };
}
