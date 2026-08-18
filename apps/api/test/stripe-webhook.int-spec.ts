import 'dotenv/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { CHECKOUT_GATEWAY } from '../src/commerce/checkout/checkout.gateway';
import { CheckoutService } from '../src/commerce/checkout/checkout.service';
import { WebhookService } from '../src/commerce/payments/webhook.service';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ACTIVE_LISTING_ID } from './cart-api.fixtures';
import {
  cleanCheckoutFixtures,
  FakeCheckoutGateway,
} from './checkout-api.fixtures';
import {
  createPendingWebhookOrder,
  verifiedCheckoutEvent,
} from './stripe-webhook.fixtures';

describe('WebhookService integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let checkoutService: CheckoutService;
  let webhookService: WebhookService;
  let gateway: FakeCheckoutGateway;

  beforeAll(async () => {
    gateway = new FakeCheckoutGateway();
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        CheckoutService,
        WebhookService,
        { provide: CHECKOUT_GATEWAY, useValue: gateway },
      ],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    checkoutService = moduleRef.get(CheckoutService);
    webhookService = moduleRef.get(WebhookService);
  });

  beforeEach(async () => {
    gateway.calls.length = 0;
    gateway.sessions.clear();
    await cleanCheckoutFixtures(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanCheckoutFixtures(prisma);
    await moduleRef?.close();
  });

  it('atomically records a paid event and transitions the pending Order', async () => {
    const pending = await createPendingWebhookOrder(
      prisma,
      checkoutService,
      gateway,
    );
    const event = verifiedCheckoutEvent({
      externalEventId: 'evt_paid_once',
      type: 'checkout.session.completed',
      orderId: pending.orderId,
      checkoutSessionId: pending.checkoutSessionId,
    });

    await expect(webhookService.handle(event)).resolves.toEqual({
      received: true,
    });

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: pending.orderId },
      include: {
        paymentEvents: true,
        statusEvents: { orderBy: { createdAt: 'asc' } },
      },
    });
    expect(order).toMatchObject({
      status: 'PAID',
      reservationReleasedAt: null,
      paymentEvents: [
        {
          externalEventId: 'evt_paid_once',
          provider: 'STRIPE',
          eventType: 'checkout.session.completed',
          status: 'PROCESSED',
          processedAt: expect.any(Date),
        },
      ],
      statusEvents: [
        { fromStatus: null, toStatus: 'PENDING_PAYMENT', source: 'CHECKOUT' },
        {
          fromStatus: 'PENDING_PAYMENT',
          toStatus: 'PAID',
          source: 'STRIPE_WEBHOOK',
          paymentEventId: expect.any(String),
        },
      ],
    });
    await expect(
      prisma.listing.findUniqueOrThrow({ where: { id: ACTIVE_LISTING_ID } }),
    ).resolves.toMatchObject({ stockQuantity: 3, inventoryVersion: 1 });
  });

  it('acknowledges a duplicate event without repeating side effects', async () => {
    const pending = await createPendingWebhookOrder(
      prisma,
      checkoutService,
      gateway,
    );
    const event = verifiedCheckoutEvent({
      externalEventId: 'evt_duplicate_paid',
      type: 'checkout.session.async_payment_succeeded',
      orderId: pending.orderId,
      checkoutSessionId: pending.checkoutSessionId,
    });

    await webhookService.handle(event);
    await expect(webhookService.handle(event)).resolves.toEqual({
      received: true,
    });

    await expect(
      prisma.paymentEvent.count({ where: { orderId: pending.orderId } }),
    ).resolves.toBe(1);
    await expect(
      prisma.orderStatusEvent.count({ where: { orderId: pending.orderId } }),
    ).resolves.toBe(2);
    await expect(
      prisma.listing.findUniqueOrThrow({ where: { id: ACTIVE_LISTING_ID } }),
    ).resolves.toMatchObject({ stockQuantity: 3, inventoryVersion: 1 });
  });

  it('records an unpaid completed session without trusting it as payment', async () => {
    const pending = await createPendingWebhookOrder(
      prisma,
      checkoutService,
      gateway,
    );
    await webhookService.handle(
      verifiedCheckoutEvent({
        externalEventId: 'evt_completed_unpaid',
        type: 'checkout.session.completed',
        orderId: pending.orderId,
        checkoutSessionId: pending.checkoutSessionId,
        paymentStatus: 'unpaid',
      }),
    );

    await expect(
      prisma.order.findUniqueOrThrow({ where: { id: pending.orderId } }),
    ).resolves.toMatchObject({ status: 'PENDING_PAYMENT' });
    await expect(
      prisma.paymentEvent.count({ where: { orderId: pending.orderId } }),
    ).resolves.toBe(1);
    await expect(
      prisma.orderStatusEvent.count({ where: { orderId: pending.orderId } }),
    ).resolves.toBe(1);
  });

  it('cancels once, releases stock once, and records a late failure', async () => {
    const pending = await createPendingWebhookOrder(
      prisma,
      checkoutService,
      gateway,
    );
    const expired = verifiedCheckoutEvent({
      externalEventId: 'evt_expired_once',
      type: 'checkout.session.expired',
      orderId: pending.orderId,
      checkoutSessionId: pending.checkoutSessionId,
      paymentStatus: 'unpaid',
    });

    await webhookService.handle(expired);
    await webhookService.handle(expired);
    await webhookService.handle(
      verifiedCheckoutEvent({
        externalEventId: 'evt_failed_late',
        type: 'checkout.session.async_payment_failed',
        orderId: pending.orderId,
        checkoutSessionId: pending.checkoutSessionId,
        paymentStatus: 'unpaid',
      }),
    );

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: pending.orderId },
      include: { paymentEvents: true, statusEvents: true },
    });
    expect(order).toMatchObject({
      status: 'CANCELLED',
      reservationReleasedAt: expect.any(Date),
    });
    expect(order.paymentEvents).toHaveLength(2);
    expect(order.statusEvents).toHaveLength(2);
    await expect(
      prisma.listing.findUniqueOrThrow({ where: { id: ACTIVE_LISTING_ID } }),
    ).resolves.toMatchObject({ stockQuantity: 5, inventoryVersion: 2 });
  });

  it('records a late terminal event without reversing a paid order', async () => {
    const pending = await createPendingWebhookOrder(
      prisma,
      checkoutService,
      gateway,
    );
    await webhookService.handle(
      verifiedCheckoutEvent({
        externalEventId: 'evt_paid_first',
        type: 'checkout.session.completed',
        orderId: pending.orderId,
        checkoutSessionId: pending.checkoutSessionId,
      }),
    );
    await webhookService.handle(
      verifiedCheckoutEvent({
        externalEventId: 'evt_expired_late',
        type: 'checkout.session.expired',
        orderId: pending.orderId,
        checkoutSessionId: pending.checkoutSessionId,
        paymentStatus: 'unpaid',
      }),
    );

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: pending.orderId },
      include: { paymentEvents: true, statusEvents: true },
    });
    expect(order.status).toBe('PAID');
    expect(order.paymentEvents).toHaveLength(2);
    expect(order.statusEvents).toHaveLength(2);
    await expect(
      prisma.listing.findUniqueOrThrow({ where: { id: ACTIVE_LISTING_ID } }),
    ).resolves.toMatchObject({ stockQuantity: 3, inventoryVersion: 1 });
  });

  it.each([
    ['session', { checkoutSessionId: 'cs_test_wrong' }],
    ['currency', { currency: 'usd' }],
    ['amount', { amountTotal: 1 }],
    ['order', { orderId: '85000000-0000-4000-8000-000000000099' }],
  ])(
    'rejects a %s mismatch without persisting the event',
    async (label, change) => {
      const pending = await createPendingWebhookOrder(
        prisma,
        checkoutService,
        gateway,
      );
      const event = verifiedCheckoutEvent({
        externalEventId: `evt_mismatch_${label}`,
        type: 'checkout.session.completed',
        orderId: pending.orderId,
        checkoutSessionId: pending.checkoutSessionId,
        ...change,
      });

      await expect(webhookService.handle(event)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      await expect(prisma.paymentEvent.count()).resolves.toBe(0);
      await expect(
        prisma.order.findUniqueOrThrow({ where: { id: pending.orderId } }),
      ).resolves.toMatchObject({ status: 'PENDING_PAYMENT' });
    },
  );
});
