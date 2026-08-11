import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import Stripe from 'stripe';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureAuthHttp } from '../src/auth/configure-auth-http';
import { CHECKOUT_GATEWAY } from '../src/commerce/checkout/checkout.gateway';
import { PrismaService } from '../src/prisma/prisma.service';
import { ACTIVE_LISTING_ID, createCartFixtures } from './cart-api.fixtures';
import {
  cleanCheckoutFixtures,
  FakeCheckoutGateway,
} from './checkout-api.fixtures';

const WEBHOOK_SECRET = 'whsec_test_synthetic_webhook_secret';
const REQUEST_ID = '85000000-0000-4000-8000-000000000002';
const RAW_UNRELATED_EVENT = Buffer.from(
  '{\n  "id": "evt_unrelated",\n  "object": "event",\n  "type": "customer.created",\n  "data": { "object": { "id": "cus_test", "object": "customer" } }\n}',
);

jest.setTimeout(30_000);

describe('Stripe webhook API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let gateway: FakeCheckoutGateway;
  const stripe = new Stripe('sk_test_synthetic_checkout_key');

  beforeAll(async () => {
    gateway = new FakeCheckoutGateway();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CHECKOUT_GATEWAY)
      .useValue(gateway)
      .compile();
    app = moduleFixture.createNestApplication({ bodyParser: false });
    configureAuthHttp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    gateway.calls.length = 0;
    gateway.sessions.clear();
    await cleanCheckoutFixtures(prisma);
    await createCartFixtures(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanCheckoutFixtures(prisma);
    await app?.close();
  });

  it('verifies exact raw bytes and acknowledges an unrelated event', async () => {
    const before = await prisma.paymentEvent.count();
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: RAW_UNRELATED_EVENT.toString('utf8'),
      secret: WEBHOOK_SECRET,
    });

    await request(app.getHttpServer())
      .post('/api/v1/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', signature)
      .send(RAW_UNRELATED_EVENT.toString('utf8'))
      .expect(200)
      .expect({ received: true });
    await expect(prisma.paymentEvent.count()).resolves.toBe(before);
  });

  it('rejects missing or invalid signatures before persistence', async () => {
    const before = await prisma.paymentEvent.count();

    await request(app.getHttpServer())
      .post('/api/v1/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .send(RAW_UNRELATED_EVENT.toString('utf8'))
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', 'invalid')
      .send(RAW_UNRELATED_EVENT.toString('utf8'))
      .expect(400);

    await expect(prisma.paymentEvent.count()).resolves.toBe(before);
  });

  it('transitions a pending Order only after a valid paid webhook', async () => {
    const guest = request.agent(app.getHttpServer());
    await guest
      .post('/api/v1/cart/items')
      .send({ listingId: ACTIVE_LISTING_ID, quantity: 2 })
      .expect(201);
    const checkout = await guest
      .post('/api/v1/checkout/session')
      .set('Idempotency-Key', REQUEST_ID)
      .send({})
      .expect(201);
    const orderId = checkout.body.data.orderId as string;
    const checkoutSessionId = checkout.body.data.checkoutSession.id as string;
    await expect(
      prisma.order.findUniqueOrThrow({ where: { id: orderId } }),
    ).resolves.toMatchObject({ status: 'PENDING_PAYMENT' });

    const rawEvent = Buffer.from(
      JSON.stringify({
        id: 'evt_e2e_paid',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: checkoutSessionId,
            object: 'checkout.session',
            metadata: { orderId },
            payment_status: 'paid',
            currency: 'uah',
            amount_total: 25000,
          },
        },
      }),
    );
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: rawEvent.toString('utf8'),
      secret: WEBHOOK_SECRET,
    });

    await request(app.getHttpServer())
      .post('/api/v1/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', signature)
      .send(rawEvent.toString('utf8'))
      .expect(200)
      .expect({ received: true });

    await expect(
      prisma.order.findUniqueOrThrow({ where: { id: orderId } }),
    ).resolves.toMatchObject({ status: 'PAID' });
    await expect(
      prisma.paymentEvent.count({ where: { orderId } }),
    ).resolves.toBe(1);
  });

  it('returns a retryable error and rolls back a mismatched signed event', async () => {
    const guest = request.agent(app.getHttpServer());
    await guest
      .post('/api/v1/cart/items')
      .send({ listingId: ACTIVE_LISTING_ID, quantity: 2 })
      .expect(201);
    const checkout = await guest
      .post('/api/v1/checkout/session')
      .set('Idempotency-Key', REQUEST_ID)
      .send({})
      .expect(201);
    const orderId = checkout.body.data.orderId as string;
    const rawEvent = Buffer.from(
      JSON.stringify({
        id: 'evt_e2e_mismatch',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: checkout.body.data.checkoutSession.id,
            object: 'checkout.session',
            metadata: { orderId },
            payment_status: 'paid',
            currency: 'uah',
            amount_total: 1,
          },
        },
      }),
    );
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: rawEvent.toString('utf8'),
      secret: WEBHOOK_SECRET,
    });

    await request(app.getHttpServer())
      .post('/api/v1/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', signature)
      .send(rawEvent.toString('utf8'))
      .expect(503);

    await expect(prisma.paymentEvent.count()).resolves.toBe(0);
    await expect(
      prisma.order.findUniqueOrThrow({ where: { id: orderId } }),
    ).resolves.toMatchObject({ status: 'PENDING_PAYMENT' });
  });
});
