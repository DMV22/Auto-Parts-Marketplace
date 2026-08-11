import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import Stripe from 'stripe';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureAuthHttp } from '../src/auth/configure-auth-http';
import { PrismaService } from '../src/prisma/prisma.service';

const WEBHOOK_SECRET = 'whsec_test_synthetic_webhook_secret';
const RAW_UNRELATED_EVENT = Buffer.from(
  '{\n  "id": "evt_unrelated",\n  "object": "event",\n  "type": "customer.created",\n  "data": { "object": { "id": "cus_test", "object": "customer" } }\n}',
);

jest.setTimeout(30_000);

describe('Stripe webhook API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const stripe = new Stripe('sk_test_synthetic_checkout_key');

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication({ bodyParser: false });
    configureAuthHttp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
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
});
