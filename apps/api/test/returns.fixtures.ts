import type { PrismaService } from '../src/prisma/prisma.service';
import {
  ACTIVE_LISTING_ID,
  cleanCartFixtures,
  createCartFixtures,
} from './cart-api.fixtures';

export const RETURN_CUSTOMER_ID = 'b3000000-0000-4000-8000-000000000001';
export const RETURN_OTHER_CUSTOMER_ID = 'b3000000-0000-4000-8000-000000000002';
export const RETURN_SUPPORT_ID = 'b3000000-0000-4000-8000-000000000003';
export const RETURN_DELIVERED_ORDER_ID = 'b3000000-0000-4000-8000-000000000010';
export const RETURN_FOREIGN_ORDER_ID = 'b3000000-0000-4000-8000-000000000011';
export const RETURN_PENDING_ORDER_ID = 'b3000000-0000-4000-8000-000000000012';
export const RETURN_GUEST_ORDER_ID = 'b3000000-0000-4000-8000-000000000013';
export const RETURN_DELIVERED_ITEM_ID = 'b3000000-0000-4000-8000-000000000020';
export const RETURN_FOREIGN_ITEM_ID = 'b3000000-0000-4000-8000-000000000021';
export const RETURN_PENDING_ITEM_ID = 'b3000000-0000-4000-8000-000000000022';
export const RETURN_GUEST_ITEM_ID = 'b3000000-0000-4000-8000-000000000023';

const ORDER_IDS = [
  RETURN_DELIVERED_ORDER_ID,
  RETURN_FOREIGN_ORDER_ID,
  RETURN_PENDING_ORDER_ID,
  RETURN_GUEST_ORDER_ID,
];
const ORDER_ITEM_IDS = [
  RETURN_DELIVERED_ITEM_ID,
  RETURN_FOREIGN_ITEM_ID,
  RETURN_PENDING_ITEM_ID,
  RETURN_GUEST_ITEM_ID,
];

export async function createReturnFixtures(
  prisma: PrismaService,
  options: {
    createUsers?: boolean;
    customerId?: string;
    otherCustomerId?: string;
  } = {},
): Promise<void> {
  await createCartFixtures(prisma);
  const createUsers = options.createUsers ?? true;
  const customerId = options.customerId ?? RETURN_CUSTOMER_ID;
  const otherCustomerId = options.otherCustomerId ?? RETURN_OTHER_CUSTOMER_ID;

  if (createUsers) {
    await prisma.user.createMany({
      data: [
        {
          id: RETURN_CUSTOMER_ID,
          name: 'Returns Customer',
          email: 'customer@returns.test',
          emailVerified: true,
        },
        {
          id: RETURN_OTHER_CUSTOMER_ID,
          name: 'Other Returns Customer',
          email: 'other@returns.test',
          emailVerified: true,
        },
        {
          id: RETURN_SUPPORT_ID,
          name: 'Returns Support',
          email: 'support@returns.test',
          emailVerified: true,
          role: 'SUPPORT_MANAGER',
        },
      ],
    });
  }

  await createOrder(prisma, {
    id: RETURN_DELIVERED_ORDER_ID,
    itemId: RETURN_DELIVERED_ITEM_ID,
    customerId,
    status: 'DELIVERED',
    createdAt: new Date('2026-08-14T10:00:00.000Z'),
  });
  await createOrder(prisma, {
    id: RETURN_FOREIGN_ORDER_ID,
    itemId: RETURN_FOREIGN_ITEM_ID,
    customerId: otherCustomerId,
    status: 'DELIVERED',
    createdAt: new Date('2026-08-13T10:00:00.000Z'),
  });
  await createOrder(prisma, {
    id: RETURN_PENDING_ORDER_ID,
    itemId: RETURN_PENDING_ITEM_ID,
    customerId,
    status: 'PAID',
    createdAt: new Date('2026-08-12T10:00:00.000Z'),
  });
  await createOrder(prisma, {
    id: RETURN_GUEST_ORDER_ID,
    itemId: RETURN_GUEST_ITEM_ID,
    guestTokenHash: 'f'.repeat(64),
    status: 'DELIVERED',
    createdAt: new Date('2026-08-11T10:00:00.000Z'),
  });
}

export async function cleanReturnFixtures(
  prisma: PrismaService,
): Promise<void> {
  const returnIds = (
    await prisma.returnRequest.findMany({
      where: { orderItemId: { in: ORDER_ITEM_IDS } },
      select: { id: true },
    })
  ).map(({ id }) => id);

  await prisma.note.deleteMany({
    where: { returnRequestId: { in: returnIds } },
  });
  await prisma.activityLog.deleteMany({
    where: {
      resourceType: 'RETURN_REQUEST',
      resourceId: { in: returnIds },
    },
  });
  await prisma.returnRequest.deleteMany({
    where: { orderItemId: { in: ORDER_ITEM_IDS } },
  });
  await prisma.orderStatusEvent.deleteMany({
    where: { orderId: { in: ORDER_IDS } },
  });
  await prisma.paymentEvent.deleteMany({
    where: { orderId: { in: ORDER_IDS } },
  });
  await prisma.orderItem.deleteMany({ where: { id: { in: ORDER_ITEM_IDS } } });
  await prisma.order.deleteMany({ where: { id: { in: ORDER_IDS } } });
  await prisma.session.deleteMany({
    where: { user: { email: { endsWith: '@returns.test' } } },
  });
  await prisma.account.deleteMany({
    where: { user: { email: { endsWith: '@returns.test' } } },
  });
  await prisma.verification.deleteMany({
    where: { identifier: { endsWith: '@returns.test' } },
  });
  await prisma.user.deleteMany({
    where: { email: { endsWith: '@returns.test' } },
  });
  await cleanCartFixtures(prisma);
}

async function createOrder(
  prisma: PrismaService,
  input: {
    id: string;
    itemId: string;
    customerId?: string;
    guestTokenHash?: string;
    status: 'PAID' | 'DELIVERED';
    createdAt: Date;
  },
): Promise<void> {
  await prisma.order.create({
    data: {
      id: input.id,
      customerId: input.customerId,
      guestTokenHash: input.guestTokenHash,
      status: input.status,
      currency: 'UAH',
      totalAmount: 125,
      createdAt: input.createdAt,
      items: {
        create: {
          id: input.itemId,
          listingId: ACTIVE_LISTING_ID,
          quantity: 1,
          unitPrice: 125,
          productName: 'Returns Historic Brake Pad',
          sku: 'RETURNS-HIST-SKU',
          manufacturerPartNumber: 'RETURNS-HIST-MPN',
          condition: 'NEW',
          supplierName: 'Returns Historic Supplier',
          createdAt: input.createdAt,
        },
      },
    },
  });
}
