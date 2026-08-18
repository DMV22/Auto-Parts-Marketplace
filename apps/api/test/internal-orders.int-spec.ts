import 'dotenv/config';
import { ConflictException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { InternalOrdersService } from '../src/internal-ops/orders/internal-orders.service';
import { InternalOrdersQueryPipe } from '../src/internal-ops/orders/internal-orders.validation';
import { InternalOpsModule } from '../src/internal-ops/internal-ops.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  cleanInternalOrderFixtures,
  createInternalOrderFixtures,
  INTERNAL_CANCELLED_ORDER_ID,
  INTERNAL_EXPIRED_ORDER_ID,
  INTERNAL_GUEST_ORDER_ID,
  INTERNAL_PAID_ORDER_ID,
  INTERNAL_PENDING_ORDER_ID,
  INTERNAL_SUPPORT_ID,
} from './internal-orders.fixtures';

const SUPPORT_ACTOR = {
  id: INTERNAL_SUPPORT_ID,
  role: 'SUPPORT_MANAGER' as const,
};

describe('InternalOrdersService integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let service: InternalOrdersService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [InternalOpsModule],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    service = moduleRef.get(InternalOrdersService);
  });

  beforeEach(async () => {
    await cleanInternalOrderFixtures(prisma);
    await createInternalOrderFixtures(prisma, { createSupport: true });
  });

  afterAll(async () => {
    if (prisma) await cleanInternalOrderFixtures(prisma);
    await moduleRef?.close();
  });

  it('returns a deterministic bounded queue with opaque pagination', async () => {
    const first = await service.list(query({ limit: '2' }));
    expect(first).toEqual({
      data: [
        expect.objectContaining({
          orderId: INTERNAL_PAID_ORDER_ID,
          paymentOutcome: 'PAID',
          customerType: 'CUSTOMER',
          customerName: 'Internal Orders Customer',
        }),
        expect.objectContaining({
          orderId: INTERNAL_PENDING_ORDER_ID,
          paymentOutcome: 'PENDING',
        }),
      ],
      pageInfo: { nextCursor: expect.any(String), hasNextPage: true },
    });

    const second = await service.list(
      query({ limit: '2', cursor: first.pageInfo.nextCursor! }),
    );
    expect(second.data.map(({ orderId }) => orderId)).toEqual([
      INTERNAL_EXPIRED_ORDER_ID,
      INTERNAL_GUEST_ORDER_ID,
    ]);
  });

  it('applies allowlisted status, payment-outcome and date filters', async () => {
    await expect(
      service.list(query({ paymentOutcome: 'FAILED_OR_EXPIRED' })),
    ).resolves.toMatchObject({
      data: [expect.objectContaining({ orderId: INTERNAL_EXPIRED_ORDER_ID })],
    });
    await expect(
      service.list(query({ paymentOutcome: 'NOT_APPLICABLE' })),
    ).resolves.toMatchObject({
      data: [expect.objectContaining({ orderId: INTERNAL_CANCELLED_ORDER_ID })],
    });
    await expect(
      service.list(
        query({
          status: 'PENDING_PAYMENT',
          createdFrom: '2026-08-12T00:00:00.000Z',
        }),
      ),
    ).resolves.toMatchObject({
      data: [expect.objectContaining({ orderId: INTERNAL_PENDING_ORDER_ID })],
    });
  });

  it('returns privacy-safe Customer and Guest details plus public timeline', async () => {
    const customer = await service.detail(INTERNAL_PAID_ORDER_ID);
    expect(customer).toMatchObject({
      customer: {
        type: 'CUSTOMER',
        id: expect.any(String),
        name: 'Internal Orders Customer',
        email: 'customer@internal-orders.test',
      },
      paymentOutcome: 'PAID',
      items: [
        {
          productName: 'Internal Historic Brake Pad',
          unitPrice: '125.00',
          quantity: 2,
          lineTotal: '250.00',
        },
      ],
    });
    expect(customer).not.toHaveProperty('guestTokenHash');
    expect(customer).not.toHaveProperty('paymentEvents');
    expect(customer).not.toHaveProperty('checkoutSessionId');
    expect(customer).not.toHaveProperty('addresses');

    await expect(
      service.detail(INTERNAL_GUEST_ORDER_ID),
    ).resolves.toMatchObject({ customer: { type: 'GUEST' } });
    await expect(
      service.timeline(INTERNAL_PAID_ORDER_ID, { limit: 20, cursor: null }),
    ).resolves.toMatchObject({
      data: [
        { status: 'PAID', reasonCode: 'PAYMENT_CONFIRMED' },
        { status: 'PENDING_PAYMENT', reasonCode: 'ORDER_CREATED' },
      ],
    });
  });

  it('atomically advances an Order and appends one timeline and audit event', async () => {
    const before = await persistedState(prisma);
    await expect(
      service.transition(
        INTERNAL_PAID_ORDER_ID,
        { targetStatus: 'PROCESSING', reason: 'Picked by warehouse' },
        SUPPORT_ACTOR,
      ),
    ).resolves.toMatchObject({
      orderId: INTERNAL_PAID_ORDER_ID,
      previousStatus: 'PAID',
      status: 'PROCESSING',
    });

    const after = await persistedState(prisma);
    expect(after.order).toMatchObject({
      status: 'PROCESSING',
      customerId: before.order.customerId,
      currency: before.order.currency,
      totalAmount: before.order.totalAmount,
    });
    expect(after.timelineCount).toBe(before.timelineCount + 1);
    expect(after.activityCount).toBe(before.activityCount + 1);
    await expect(
      prisma.orderStatusEvent.findFirstOrThrow({
        where: {
          orderId: INTERNAL_PAID_ORDER_ID,
          source: 'INTERNAL_OPS',
        },
      }),
    ).resolves.toMatchObject({
      fromStatus: 'PAID',
      toStatus: 'PROCESSING',
      source: 'INTERNAL_OPS',
      paymentEventId: null,
    });
    await expect(
      prisma.activityLog.findFirstOrThrow({
        where: {
          resourceType: 'ORDER',
          resourceId: INTERNAL_PAID_ORDER_ID,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ).resolves.toMatchObject({
      actorUserId: INTERNAL_SUPPORT_ID,
      actorRole: 'SUPPORT_MANAGER',
      action: 'ORDER_STATUS_CHANGED',
      previousStatus: 'PAID',
      newStatus: 'PROCESSING',
      reason: 'Picked by warehouse',
    });
  });

  it('rejects payment, skipped and concurrent transitions without duplicate side effects', async () => {
    const before = await persistedState(prisma);
    await expect(
      service.transition(
        INTERNAL_PENDING_ORDER_ID,
        { targetStatus: 'PAID', reason: null },
        SUPPORT_ACTOR,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.transition(
        INTERNAL_PAID_ORDER_ID,
        { targetStatus: 'SHIPPED', reason: null },
        SUPPORT_ACTOR,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(await persistedState(prisma)).toEqual(before);

    const concurrent = await Promise.allSettled([
      service.transition(
        INTERNAL_PAID_ORDER_ID,
        { targetStatus: 'PROCESSING', reason: null },
        SUPPORT_ACTOR,
      ),
      service.transition(
        INTERNAL_PAID_ORDER_ID,
        { targetStatus: 'PROCESSING', reason: null },
        SUPPORT_ACTOR,
      ),
    ]);
    expect(
      concurrent.filter(({ status }) => status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      concurrent.filter(({ status }) => status === 'rejected'),
    ).toHaveLength(1);
    const after = await persistedState(prisma);
    expect(after.timelineCount).toBe(before.timelineCount + 1);
    expect(after.activityCount).toBe(before.activityCount + 1);
  });
});

function query(input: Record<string, string> = {}) {
  return new InternalOrdersQueryPipe().transform(input);
}

async function persistedState(prisma: PrismaService) {
  const [order, timelineCount, activityCount] = await Promise.all([
    prisma.order.findUniqueOrThrow({
      where: { id: INTERNAL_PAID_ORDER_ID },
      select: {
        status: true,
        customerId: true,
        currency: true,
        totalAmount: true,
      },
    }),
    prisma.orderStatusEvent.count({
      where: { orderId: INTERNAL_PAID_ORDER_ID },
    }),
    prisma.activityLog.count({
      where: {
        resourceType: 'ORDER',
        resourceId: INTERNAL_PAID_ORDER_ID,
      },
    }),
  ]);
  return {
    order: { ...order, totalAmount: order.totalAmount.toFixed(2) },
    timelineCount,
    activityCount,
  };
}
