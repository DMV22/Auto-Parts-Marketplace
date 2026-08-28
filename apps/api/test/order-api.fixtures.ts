import { createHash } from 'node:crypto';
import type { PrismaService } from '../src/prisma/prisma.service';
import { ACTIVE_LISTING_ID, createCartFixtures } from './cart-api.fixtures';
import { cleanCheckoutFixtures } from './checkout-api.fixtures';

export const ORDER_CUSTOMER_ID = '86000000-0000-4000-8000-000000000001';
export const OTHER_CUSTOMER_ID = '86000000-0000-4000-8000-000000000002';
export const CUSTOMER_PAID_ORDER_ID = '86000000-0000-4000-8000-000000000010';
export const CUSTOMER_PENDING_ORDER_ID = '86000000-0000-4000-8000-000000000011';
export const CUSTOMER_EXPIRED_ORDER_ID = '86000000-0000-4000-8000-000000000012';
export const GUEST_ORDER_ID = '86000000-0000-4000-8000-000000000013';
export const OTHER_ORDER_ID = '86000000-0000-4000-8000-000000000014';
export const ORDER_GUEST_TOKEN = 'g'.repeat(43);
export const ORDER_GUEST_HASH = createHash('sha256')
  .update(ORDER_GUEST_TOKEN)
  .digest('hex');

const PAID_PAYMENT_EVENT_ID = '86000000-0000-4000-8000-000000000020';
const EXPIRED_PAYMENT_EVENT_ID = '86000000-0000-4000-8000-000000000021';

export async function createOrderReadFixtures(
  prisma: PrismaService,
  customerId = ORDER_CUSTOMER_ID,
): Promise<void> {
  await createCartFixtures(prisma);
  if (customerId === ORDER_CUSTOMER_ID) {
    await prisma.user.create({
      data: {
        id: ORDER_CUSTOMER_ID,
        name: 'Order Owner',
        email: 'owner@orders.test',
        emailVerified: true,
      },
    });
  }
  await prisma.user.create({
    data: {
      id: OTHER_CUSTOMER_ID,
      name: 'Other Order Owner',
      email: 'other@orders.test',
      emailVerified: true,
    },
  });

  await createSnapshotOrder(prisma, {
    id: CUSTOMER_PAID_ORDER_ID,
    customerId,
    status: 'PAID',
    createdAt: new Date('2026-08-11T10:00:00.000Z'),
    quantity: 2,
  });
  await prisma.paymentEvent.create({
    data: {
      id: PAID_PAYMENT_EVENT_ID,
      orderId: CUSTOMER_PAID_ORDER_ID,
      externalEventId: 'evt_order_read_paid',
      provider: 'STRIPE',
      eventType: 'checkout.session.completed',
      status: 'PROCESSED',
      payload: { secret: 'must-not-be-public' },
      processedAt: new Date('2026-08-11T10:05:00.000Z'),
    },
  });
  await prisma.orderStatusEvent.create({
    data: {
      id: '86000000-0000-4000-8000-000000000031',
      orderId: CUSTOMER_PAID_ORDER_ID,
      fromStatus: 'PENDING_PAYMENT',
      toStatus: 'PAID',
      source: 'STRIPE_WEBHOOK',
      paymentEventId: PAID_PAYMENT_EVENT_ID,
      createdAt: new Date('2026-08-11T10:05:00.000Z'),
    },
  });

  await createSnapshotOrder(prisma, {
    id: CUSTOMER_PENDING_ORDER_ID,
    customerId,
    status: 'PENDING_PAYMENT',
    createdAt: new Date('2026-08-10T10:00:00.000Z'),
  });
  await createSnapshotOrder(prisma, {
    id: CUSTOMER_EXPIRED_ORDER_ID,
    customerId,
    status: 'CANCELLED',
    createdAt: new Date('2026-08-09T10:00:00.000Z'),
  });
  await prisma.paymentEvent.create({
    data: {
      id: EXPIRED_PAYMENT_EVENT_ID,
      orderId: CUSTOMER_EXPIRED_ORDER_ID,
      externalEventId: 'evt_order_read_expired',
      provider: 'STRIPE',
      eventType: 'checkout.session.expired',
      status: 'PROCESSED',
      payload: { secret: 'must-not-be-public' },
      processedAt: new Date('2026-08-09T10:30:00.000Z'),
    },
  });
  await prisma.orderStatusEvent.create({
    data: {
      id: '86000000-0000-4000-8000-000000000032',
      orderId: CUSTOMER_EXPIRED_ORDER_ID,
      fromStatus: 'PENDING_PAYMENT',
      toStatus: 'CANCELLED',
      source: 'STRIPE_WEBHOOK',
      paymentEventId: EXPIRED_PAYMENT_EVENT_ID,
      createdAt: new Date('2026-08-09T10:30:00.000Z'),
    },
  });

  await createSnapshotOrder(prisma, {
    id: GUEST_ORDER_ID,
    guestTokenHash: ORDER_GUEST_HASH,
    status: 'PENDING_PAYMENT',
    createdAt: new Date('2026-08-08T10:00:00.000Z'),
  });
  await createSnapshotOrder(prisma, {
    id: OTHER_ORDER_ID,
    customerId: OTHER_CUSTOMER_ID,
    status: 'PENDING_PAYMENT',
    createdAt: new Date('2026-08-12T10:00:00.000Z'),
  });
}

export async function cleanOrderReadFixtures(
  prisma: PrismaService,
): Promise<void> {
  await cleanCheckoutFixtures(prisma);
  await prisma.user.deleteMany({
    where: { email: { endsWith: '@orders.test' } },
  });
}

async function createSnapshotOrder(
  prisma: PrismaService,
  input: {
    id: string;
    customerId?: string;
    guestTokenHash?: string;
    status: 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED';
    createdAt: Date;
    quantity?: number;
  },
): Promise<void> {
  const quantity = input.quantity ?? 1;
  await prisma.order.create({
    data: {
      id: input.id,
      customerId: input.customerId,
      guestTokenHash: input.guestTokenHash,
      status: input.status,
      currency: 'UAH',
      totalAmount: 125 * quantity,
      createdAt: input.createdAt,
      items: {
        create: {
          listingId: ACTIVE_LISTING_ID,
          quantity,
          unitPrice: 125,
          productName: 'Historic Brake Pad',
          sku: 'HIST-SKU-100',
          manufacturerPartNumber: 'HIST-MPN-100',
          condition: 'NEW',
          supplierName: 'Historic Supplier',
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
