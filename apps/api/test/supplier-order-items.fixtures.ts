import type { PrismaService } from '../src/prisma/prisma.service';

export const SUPPLIER_ORDER_BRAND_ID = '94000000-0000-4000-8000-000000000001';
export const SUPPLIER_ORDER_PRODUCT_ID = '94000000-0000-4000-8000-000000000002';
export const SUPPLIER_ORDER_VARIANT_ID = '94000000-0000-4000-8000-000000000003';
export const SUPPLIER_ORDER_A_ID = '94000000-0000-4000-8000-000000000004';
export const SUPPLIER_ORDER_B_ID = '94000000-0000-4000-8000-000000000005';
export const SUPPLIER_ORDER_LISTING_A_ID =
  '94000000-0000-4000-8000-000000000010';
export const SUPPLIER_ORDER_LISTING_A_SECOND_ID =
  '94000000-0000-4000-8000-000000000011';
export const SUPPLIER_ORDER_LISTING_B_ID =
  '94000000-0000-4000-8000-000000000012';
export const MULTI_SUPPLIER_ORDER_ID = '94000000-0000-4000-8000-000000000020';
export const PROCESSING_ORDER_ID = '94000000-0000-4000-8000-000000000021';
export const CANCELLED_ORDER_ID = '94000000-0000-4000-8000-000000000022';
export const FOREIGN_ORDER_ID = '94000000-0000-4000-8000-000000000023';
export const OWN_ORDER_ITEM_ID = '94000000-0000-4000-8000-000000000030';
export const OWN_SECOND_ORDER_ITEM_ID = '94000000-0000-4000-8000-000000000031';
export const FOREIGN_ORDER_ITEM_ID = '94000000-0000-4000-8000-000000000032';
export const PROCESSING_ORDER_ITEM_ID = '94000000-0000-4000-8000-000000000033';
export const CANCELLED_ORDER_ITEM_ID = '94000000-0000-4000-8000-000000000034';
export const FOREIGN_ONLY_ORDER_ITEM_ID =
  '94000000-0000-4000-8000-000000000035';
export const MULTI_ORDER_CREATED_AT = new Date('2026-08-12T10:00:00.000Z');
export const AUTH_EMAILS = [
  'owner@supplier-order-items.test',
  'disabled@supplier-order-items.test',
  'support@supplier-order-items.test',
  'admin@supplier-order-items.test',
];

const CUSTOMER_ID = '94000000-0000-4000-8000-000000000040';
const TEST_EMAILS = [...AUTH_EMAILS, 'buyer@supplier-order-items.test'];

export async function createSupplierOrderItemFixtures(
  prisma: PrismaService,
): Promise<void> {
  await prisma.brand.create({
    data: { id: SUPPLIER_ORDER_BRAND_ID, name: 'Supplier Order Item Brand' },
  });
  await prisma.product.create({
    data: {
      id: SUPPLIER_ORDER_PRODUCT_ID,
      name: 'Current Product Name Must Not Replace Snapshot',
      brandId: SUPPLIER_ORDER_BRAND_ID,
      variants: {
        create: {
          id: SUPPLIER_ORDER_VARIANT_ID,
          sku: 'CURRENT-SKU',
          manufacturerPartNumber: 'CURRENT-MPN',
        },
      },
    },
  });
  await prisma.supplier.createMany({
    data: [
      {
        id: SUPPLIER_ORDER_A_ID,
        name: 'Supplier Order A',
        slug: 'supplier-order-a',
      },
      {
        id: SUPPLIER_ORDER_B_ID,
        name: 'Supplier Order B',
        slug: 'supplier-order-b',
      },
    ],
  });
  await prisma.listing.createMany({
    data: [
      listing(SUPPLIER_ORDER_LISTING_A_ID, SUPPLIER_ORDER_A_ID, 125),
      listing(SUPPLIER_ORDER_LISTING_A_SECOND_ID, SUPPLIER_ORDER_A_ID, 50),
      listing(SUPPLIER_ORDER_LISTING_B_ID, SUPPLIER_ORDER_B_ID, 75),
    ],
  });
  await prisma.user.create({
    data: {
      id: CUSTOMER_ID,
      name: 'Private Buyer',
      email: 'buyer@supplier-order-items.test',
      emailVerified: true,
      addresses: {
        create: {
          label: 'Private delivery address',
          recipientName: 'Private Buyer',
          line1: 'Secret Street 1',
          city: 'Kyiv',
          postalCode: '01001',
          countryCode: 'UA',
        },
      },
    },
  });

  await prisma.order.create({
    data: {
      id: MULTI_SUPPLIER_ORDER_ID,
      customerId: CUSTOMER_ID,
      status: 'PAID',
      currency: 'UAH',
      totalAmount: 375,
      checkoutSessionId: 'cs_private_supplier_projection',
      checkoutSessionUrl: 'https://stripe.example/private',
      createdAt: MULTI_ORDER_CREATED_AT,
      updatedAt: MULTI_ORDER_CREATED_AT,
      items: {
        create: [
          orderItem(
            OWN_SECOND_ORDER_ITEM_ID,
            SUPPLIER_ORDER_LISTING_A_SECOND_ID,
            'Historic Oil Filter',
            'HIST-OIL-1',
            'HIST-OIL-MPN',
            2,
            50,
            MULTI_ORDER_CREATED_AT,
          ),
          orderItem(
            OWN_ORDER_ITEM_ID,
            SUPPLIER_ORDER_LISTING_A_ID,
            'Historic Brake Pad',
            'HIST-BRAKE-1',
            'HIST-BRAKE-MPN',
            1,
            125,
            MULTI_ORDER_CREATED_AT,
          ),
          orderItem(
            FOREIGN_ORDER_ITEM_ID,
            SUPPLIER_ORDER_LISTING_B_ID,
            'Foreign Supplier Item',
            'FOREIGN-SKU',
            'FOREIGN-MPN',
            2,
            75,
            MULTI_ORDER_CREATED_AT,
          ),
        ],
      },
      paymentEvents: {
        create: {
          externalEventId: 'evt_supplier_order_items_private',
          provider: 'STRIPE',
          eventType: 'checkout.session.completed',
          status: 'PROCESSED',
          payload: { secret: 'must-never-reach-supplier' },
          processedAt: new Date('2026-08-12T10:05:00.000Z'),
        },
      },
    },
  });
  await createSingleItemOrder(prisma, {
    id: PROCESSING_ORDER_ID,
    itemId: PROCESSING_ORDER_ITEM_ID,
    listingId: SUPPLIER_ORDER_LISTING_A_ID,
    status: 'PROCESSING',
    createdAt: new Date('2026-08-11T10:00:00.000Z'),
  });
  await createSingleItemOrder(prisma, {
    id: CANCELLED_ORDER_ID,
    itemId: CANCELLED_ORDER_ITEM_ID,
    listingId: SUPPLIER_ORDER_LISTING_A_ID,
    status: 'CANCELLED',
    createdAt: new Date('2026-08-10T10:00:00.000Z'),
  });
  await createSingleItemOrder(prisma, {
    id: FOREIGN_ORDER_ID,
    itemId: FOREIGN_ONLY_ORDER_ITEM_ID,
    listingId: SUPPLIER_ORDER_LISTING_B_ID,
    status: 'SHIPPED',
    createdAt: new Date('2026-08-13T10:00:00.000Z'),
  });
}

export async function cleanSupplierOrderItemFixtures(
  prisma: PrismaService,
): Promise<void> {
  await prisma.supplierUser.deleteMany({
    where: { user: { email: { in: TEST_EMAILS } } },
  });
  await prisma.session.deleteMany({
    where: { user: { email: { in: TEST_EMAILS } } },
  });
  await prisma.account.deleteMany({
    where: { user: { email: { in: TEST_EMAILS } } },
  });
  await prisma.verification.deleteMany({
    where: { identifier: { in: TEST_EMAILS } },
  });
  await prisma.paymentEvent.deleteMany({
    where: {
      orderId: {
        in: [
          MULTI_SUPPLIER_ORDER_ID,
          PROCESSING_ORDER_ID,
          CANCELLED_ORDER_ID,
          FOREIGN_ORDER_ID,
        ],
      },
    },
  });
  await prisma.orderStatusEvent.deleteMany({
    where: {
      orderId: {
        in: [
          MULTI_SUPPLIER_ORDER_ID,
          PROCESSING_ORDER_ID,
          CANCELLED_ORDER_ID,
          FOREIGN_ORDER_ID,
        ],
      },
    },
  });
  await prisma.orderItem.deleteMany({
    where: {
      orderId: {
        in: [
          MULTI_SUPPLIER_ORDER_ID,
          PROCESSING_ORDER_ID,
          CANCELLED_ORDER_ID,
          FOREIGN_ORDER_ID,
        ],
      },
    },
  });
  await prisma.order.deleteMany({
    where: {
      id: {
        in: [
          MULTI_SUPPLIER_ORDER_ID,
          PROCESSING_ORDER_ID,
          CANCELLED_ORDER_ID,
          FOREIGN_ORDER_ID,
        ],
      },
    },
  });
  await prisma.user.deleteMany({ where: { email: { in: TEST_EMAILS } } });
  await prisma.listing.deleteMany({
    where: {
      supplierId: { in: [SUPPLIER_ORDER_A_ID, SUPPLIER_ORDER_B_ID] },
    },
  });
  await prisma.supplier.deleteMany({
    where: { id: { in: [SUPPLIER_ORDER_A_ID, SUPPLIER_ORDER_B_ID] } },
  });
  await prisma.product.deleteMany({ where: { id: SUPPLIER_ORDER_PRODUCT_ID } });
  await prisma.brand.deleteMany({ where: { id: SUPPLIER_ORDER_BRAND_ID } });
}

function listing(id: string, supplierId: string, price: number) {
  return {
    id,
    supplierId,
    productVariantId: SUPPLIER_ORDER_VARIANT_ID,
    status: 'ACTIVE' as const,
    condition: 'NEW' as const,
    price,
    currency: 'UAH',
    stockQuantity: 10,
  };
}

function orderItem(
  id: string,
  listingId: string,
  productName: string,
  sku: string,
  manufacturerPartNumber: string,
  quantity: number,
  unitPrice: number,
  createdAt: Date,
) {
  return {
    id,
    listingId,
    productName,
    sku,
    manufacturerPartNumber,
    condition: 'NEW' as const,
    supplierName: 'Internal snapshot not projected',
    quantity,
    unitPrice,
    createdAt,
  };
}

async function createSingleItemOrder(
  prisma: PrismaService,
  input: {
    id: string;
    itemId: string;
    listingId: string;
    status: 'PROCESSING' | 'CANCELLED' | 'SHIPPED';
    createdAt: Date;
  },
): Promise<void> {
  await prisma.order.create({
    data: {
      id: input.id,
      guestTokenHash: input.id.replaceAll('-', '').padEnd(64, '0'),
      status: input.status,
      currency: 'UAH',
      totalAmount: 125,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
      items: {
        create: orderItem(
          input.itemId,
          input.listingId,
          `Historic ${input.status} Item`,
          `HIST-${input.status}`,
          `MPN-${input.status}`,
          1,
          125,
          input.createdAt,
        ),
      },
    },
  });
}
