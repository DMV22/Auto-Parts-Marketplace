import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
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

const REQUEST_ID = '84000000-0000-4000-8000-000000000001';
const CUSTOMER_REQUEST_ID = '84000000-0000-4000-8000-000000000002';
const PASSWORD = 'Password-12345';

jest.setTimeout(30_000);

describe('Checkout API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let gateway: FakeCheckoutGateway;

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
    gateway.error = null;
    await cleanCheckoutFixtures(prisma);
    await createCartFixtures(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanCheckoutFixtures(prisma);
    await app?.close();
  });

  it('creates and safely retries a Guest pending checkout through HTTP', async () => {
    const guest = request.agent(app.getHttpServer());
    await guest
      .post('/api/v1/cart/items')
      .send({ listingId: ACTIVE_LISTING_ID, quantity: 2 })
      .expect(201);

    const created = await guest
      .post('/api/v1/checkout/session')
      .set('Idempotency-Key', REQUEST_ID)
      .send({})
      .expect(201);
    expect(created.body.data).toMatchObject({
      orderId: expect.any(String),
      status: 'PENDING_PAYMENT',
      currency: 'UAH',
      totalAmount: '250.00',
      checkoutSession: {
        id: expect.stringMatching(/^cs_test_/),
        url: expect.stringMatching(/^https:\/\/checkout\.stripe\.test\//),
      },
    });

    await guest
      .post('/api/v1/checkout/session')
      .set('Idempotency-Key', REQUEST_ID)
      .send({})
      .expect(201)
      .expect((response) => expect(response.body).toEqual(created.body));
    expect(gateway.calls).toHaveLength(1);
  });

  it('rejects untrusted checkout input and an empty cart', async () => {
    const guest = request.agent(app.getHttpServer());

    await guest.post('/api/v1/checkout/session').send({}).expect(400);
    await guest
      .post('/api/v1/checkout/session')
      .set('Idempotency-Key', 'not-a-uuid')
      .send({})
      .expect(400);
    await guest
      .post('/api/v1/checkout/session')
      .set('Idempotency-Key', REQUEST_ID)
      .send({ price: '1.00', total: '1.00', status: 'PAID' })
      .expect(400);
    await guest
      .post('/api/v1/checkout/session')
      .set('Idempotency-Key', REQUEST_ID)
      .send({})
      .expect(409);

    await expect(prisma.order.count()).resolves.toBe(0);
    expect(gateway.calls).toHaveLength(0);
  });

  it('isolates Customer checkout ownership from a Guest context', async () => {
    const customer = request.agent(app.getHttpServer());
    await customer
      .post('/api/auth/sign-up/email')
      .send({
        name: 'Checkout Customer',
        email: 'checkout-owner@cart.test',
        password: PASSWORD,
      })
      .expect(200);
    await customer
      .post('/api/v1/cart/items')
      .send({ listingId: ACTIVE_LISTING_ID, quantity: 1 })
      .expect(201);
    const created = await customer
      .post('/api/v1/checkout/session')
      .set('Idempotency-Key', CUSTOMER_REQUEST_ID)
      .send({})
      .expect(201);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: created.body.data.orderId as string },
    });
    expect(order.customerId).toEqual(expect.any(String));
    expect(order.guestTokenHash).toBeNull();

    const guest = request.agent(app.getHttpServer());
    await guest
      .post('/api/v1/cart/items')
      .send({ listingId: ACTIVE_LISTING_ID, quantity: 1 })
      .expect(201);
    await guest
      .post('/api/v1/checkout/session')
      .set('Idempotency-Key', CUSTOMER_REQUEST_ID)
      .send({})
      .expect(409);
    await expect(prisma.order.count()).resolves.toBe(1);
  });
});
