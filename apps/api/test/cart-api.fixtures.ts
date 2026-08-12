import { PrismaService } from '../src/prisma/prisma.service';

export const CART_BRAND_ID = '82000000-0000-4000-8000-000000000001';
export const CART_CATEGORY_ID = '82000000-0000-4000-8000-000000000002';
export const CART_SUPPLIER_ID = '82000000-0000-4000-8000-000000000003';
export const CART_PRODUCT_ID = '82000000-0000-4000-8000-000000000004';
export const CART_VARIANT_ID = '82000000-0000-4000-8000-000000000005';
export const ACTIVE_LISTING_ID = '82000000-0000-4000-8000-000000000006';
export const OTHER_CURRENCY_LISTING_ID = '82000000-0000-4000-8000-000000000007';
export const PAUSED_LISTING_ID = '82000000-0000-4000-8000-000000000008';
export const EMPTY_LISTING_ID = '82000000-0000-4000-8000-000000000009';

export async function createCartFixtures(prisma: PrismaService): Promise<void> {
  await prisma.brand.create({
    data: { id: CART_BRAND_ID, name: 'Cart Test Brand' },
  });
  await prisma.category.create({
    data: { id: CART_CATEGORY_ID, name: 'Cart Test Category' },
  });
  await prisma.supplier.create({
    data: {
      id: CART_SUPPLIER_ID,
      name: 'Cart Test Supplier',
      slug: 'cart-test-supplier',
    },
  });
  await prisma.product.create({
    data: {
      id: CART_PRODUCT_ID,
      name: 'Cart Test Brake Pad',
      brandId: CART_BRAND_ID,
      categoryId: CART_CATEGORY_ID,
      variants: {
        create: {
          id: CART_VARIANT_ID,
          sku: 'CART-SKU-100',
          manufacturerPartNumber: 'CART-MPN-100',
          listings: {
            create: [
              {
                id: ACTIVE_LISTING_ID,
                supplierId: CART_SUPPLIER_ID,
                status: 'ACTIVE',
                condition: 'NEW',
                price: 125,
                currency: 'UAH',
                stockQuantity: 5,
              },
              {
                id: OTHER_CURRENCY_LISTING_ID,
                supplierId: CART_SUPPLIER_ID,
                status: 'ACTIVE',
                condition: 'NEW',
                price: 10,
                currency: 'USD',
                stockQuantity: 5,
              },
              {
                id: PAUSED_LISTING_ID,
                supplierId: CART_SUPPLIER_ID,
                status: 'PAUSED',
                condition: 'USED',
                price: 50,
                currency: 'UAH',
                stockQuantity: 5,
              },
              {
                id: EMPTY_LISTING_ID,
                supplierId: CART_SUPPLIER_ID,
                status: 'ACTIVE',
                condition: 'REMANUFACTURED',
                price: 80,
                currency: 'UAH',
                stockQuantity: 0,
              },
            ],
          },
        },
      },
    },
  });
}

export async function cleanCartFixtures(prisma: PrismaService): Promise<void> {
  await prisma.cart.deleteMany();
  await prisma.session.deleteMany({
    where: { user: { email: { endsWith: '@cart.test' } } },
  });
  await prisma.account.deleteMany({
    where: { user: { email: { endsWith: '@cart.test' } } },
  });
  await prisma.user.deleteMany({
    where: { email: { endsWith: '@cart.test' } },
  });
  await prisma.listing.deleteMany({ where: { supplierId: CART_SUPPLIER_ID } });
  await prisma.product.deleteMany({ where: { id: CART_PRODUCT_ID } });
  await prisma.supplier.deleteMany({ where: { id: CART_SUPPLIER_ID } });
  await prisma.category.deleteMany({ where: { id: CART_CATEGORY_ID } });
  await prisma.brand.deleteMany({ where: { id: CART_BRAND_ID } });
}
