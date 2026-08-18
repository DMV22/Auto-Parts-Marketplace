import type { PrismaService } from '../src/prisma/prisma.service';
import {
  ACTIVE_LISTING_ID,
  cleanCartFixtures,
  createCartFixtures,
} from './cart-api.fixtures';

export const INTERNAL_CUSTOMER_ID = 'b2000000-0000-4000-8000-000000000001';
export const INTERNAL_SUPPORT_ID = 'b2000000-0000-4000-8000-000000000002';
export const INTERNAL_PAID_ORDER_ID = 'b2000000-0000-4000-8000-000000000010';
export const INTERNAL_PENDING_ORDER_ID = 'b2000000-0000-4000-8000-000000000011';
export const INTERNAL_EXPIRED_ORDER_ID = 'b2000000-0000-4000-8000-000000000012';
export const INTERNAL_GUEST_ORDER_ID = 'b2000000-0000-4000-8000-000000000013';
export const INTERNAL_CANCELLED_ORDER_ID =
  'b2000000-0000-4000-8000-000000000014';
const INTERNAL_ORDER_IDS = [
  INTERNAL_PAID_ORDER_ID,
  INTERNAL_PENDING_ORDER_ID,
  INTERNAL_EXPIRED_ORDER_ID,
  INTERNAL_GUEST_ORDER_ID,
  INTERNAL_CANCELLED_ORDER_ID,
];

export async function createInternalOrderFixtures(
  prisma: PrismaService,
  options: { createSupport?: boolean } = {},
): Promise<void> {
  await createCartFixtures(prisma);
  await prisma.user.create({
    data: {
      id: INTERNAL_CUSTOMER_ID,
      name: 'Internal Orders Customer',
      email: 'customer@internal-orders.test',
      emailVerified: true,
    },
  });
  if (options.createSupport) {
    await prisma.user.create({
      data: {
        id: INTERNAL_SUPPORT_ID,
        name: 'Internal Orders Support',
        email: 'support@internal-orders.test',
        emailVerified: true,
        role: 'SUPPORT_MANAGER',
      },
    });
  }

  await createOrder(prisma, {
    id: INTERNAL_PAID_ORDER_ID,
    customerId: INTERNAL_CUSTOMER_ID,
    status: 'PAID',
    createdAt: new Date('2026-08-14T10:00:00.000Z'),
  });
  const paidEvent = await prisma.paymentEvent.create({
    data: {
      orderId: INTERNAL_PAID_ORDER_ID,
      externalEventId: 'evt_internal_orders_paid',
      provider: 'STRIPE',
      eventType: 'checkout.session.completed',
      status: 'PROCESSED',
      payload: { secret: 'must-never-be-projected' },
      processedAt: new Date('2026-08-14T10:05:00.000Z'),
    },
  });
  await prisma.orderStatusEvent.create({
    data: {
      orderId: INTERNAL_PAID_ORDER_ID,
      fromStatus: 'PENDING_PAYMENT',
      toStatus: 'PAID',
      source: 'STRIPE_WEBHOOK',
      paymentEventId: paidEvent.id,
      createdAt: new Date('2026-08-14T10:05:00.000Z'),
    },
  });

  await createOrder(prisma, {
    id: INTERNAL_PENDING_ORDER_ID,
    customerId: INTERNAL_CUSTOMER_ID,
    status: 'PENDING_PAYMENT',
    createdAt: new Date('2026-08-13T10:00:00.000Z'),
  });
  await createOrder(prisma, {
    id: INTERNAL_EXPIRED_ORDER_ID,
    customerId: INTERNAL_CUSTOMER_ID,
    status: 'CANCELLED',
    createdAt: new Date('2026-08-12T10:00:00.000Z'),
  });
  const expiredEvent = await prisma.paymentEvent.create({
    data: {
      orderId: INTERNAL_EXPIRED_ORDER_ID,
      externalEventId: 'evt_internal_orders_expired',
      provider: 'STRIPE',
      eventType: 'checkout.session.expired',
      status: 'PROCESSED',
      payload: { secret: 'must-never-be-projected' },
      processedAt: new Date('2026-08-12T10:05:00.000Z'),
    },
  });
  await prisma.orderStatusEvent.create({
    data: {
      orderId: INTERNAL_EXPIRED_ORDER_ID,
      fromStatus: 'PENDING_PAYMENT',
      toStatus: 'CANCELLED',
      source: 'STRIPE_WEBHOOK',
      paymentEventId: expiredEvent.id,
      createdAt: new Date('2026-08-12T10:05:00.000Z'),
    },
  });
  await createOrder(prisma, {
    id: INTERNAL_GUEST_ORDER_ID,
    guestTokenHash: 'e'.repeat(64),
    status: 'PENDING_PAYMENT',
    createdAt: new Date('2026-08-11T10:00:00.000Z'),
  });
  await createOrder(prisma, {
    id: INTERNAL_CANCELLED_ORDER_ID,
    customerId: INTERNAL_CUSTOMER_ID,
    status: 'CANCELLED',
    createdAt: new Date('2026-08-10T10:00:00.000Z'),
  });
}

export async function cleanInternalOrderFixtures(
  prisma: PrismaService,
): Promise<void> {
  await prisma.activityLog.deleteMany({
    where: {
      resourceType: 'ORDER',
      resourceId: { in: INTERNAL_ORDER_IDS },
    },
  });
  await prisma.orderStatusEvent.deleteMany({
    where: { orderId: { in: INTERNAL_ORDER_IDS } },
  });
  await prisma.paymentEvent.deleteMany({
    where: { orderId: { in: INTERNAL_ORDER_IDS } },
  });
  await prisma.orderItem.deleteMany({
    where: { orderId: { in: INTERNAL_ORDER_IDS } },
  });
  await prisma.order.deleteMany({ where: { id: { in: INTERNAL_ORDER_IDS } } });
  await prisma.session.deleteMany({
    where: { user: { email: { endsWith: '@internal-orders.test' } } },
  });
  await prisma.account.deleteMany({
    where: { user: { email: { endsWith: '@internal-orders.test' } } },
  });
  await prisma.verification.deleteMany({
    where: { identifier: { endsWith: '@internal-orders.test' } },
  });
  await prisma.user.deleteMany({
    where: { email: { endsWith: '@internal-orders.test' } },
  });
  await cleanCartFixtures(prisma);
}

async function createOrder(
  prisma: PrismaService,
  input: {
    id: string;
    customerId?: string;
    guestTokenHash?: string;
    status: 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED';
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
      totalAmount: 250,
      createdAt: input.createdAt,
      items: {
        create: {
          listingId: ACTIVE_LISTING_ID,
          quantity: 2,
          unitPrice: 125,
          productName: 'Internal Historic Brake Pad',
          sku: 'INTERNAL-HIST-SKU',
          manufacturerPartNumber: 'INTERNAL-HIST-MPN',
          condition: 'NEW',
          supplierName: 'Internal Historic Supplier',
          createdAt: input.createdAt,
        },
      },
      statusEvents: {
        create: {
          fromStatus: null,
          toStatus: 'PENDING_PAYMENT',
          source: 'CHECKOUT',
          createdAt: input.createdAt,
        },
      },
    },
  });
}
