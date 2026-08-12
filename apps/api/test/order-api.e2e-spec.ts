import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureAuthHttp } from '../src/auth/configure-auth-http';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  cleanOrderReadFixtures,
  createOrderReadFixtures,
  CUSTOMER_PAID_ORDER_ID,
  GUEST_ORDER_ID,
  ORDER_GUEST_TOKEN,
  OTHER_ORDER_ID,
} from './order-api.fixtures';

const PASSWORD = 'Password-12345';
const MISSING_ORDER_ID = '86000000-0000-4000-8000-000000000099';

jest.setTimeout(30_000);

describe('Orders API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication({ bodyParser: false });
    configureAuthHttp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanOrderReadFixtures(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanOrderReadFixtures(prisma);
    await app?.close();
  });

  it('returns Customer history, immutable detail and a public timeline', async () => {
    const customer = await createCustomerAgent();

    const history = await customer.get('/api/v1/orders?limit=2').expect(200);
    expect(history.body).toMatchObject({
      data: [
        { orderId: CUSTOMER_PAID_ORDER_ID, status: 'PAID' },
        { status: 'PENDING_PAYMENT' },
      ],
      pageInfo: { nextCursor: expect.any(String), hasNextPage: true },
    });

    const detail = await customer
      .get(`/api/v1/orders/${CUSTOMER_PAID_ORDER_ID}`)
      .expect(200);
    expect(detail.body.data).toMatchObject({
      orderId: CUSTOMER_PAID_ORDER_ID,
      status: 'PAID',
      totalAmount: '250.00',
      items: [
        {
          productName: 'Historic Brake Pad',
          unitPrice: '125.00',
          quantity: 2,
          lineTotal: '250.00',
        },
      ],
    });
    expect(detail.body.data).not.toHaveProperty('customerId');
    expect(detail.body.data).not.toHaveProperty('guestTokenHash');
    expect(detail.body.data).not.toHaveProperty('paymentEvents');
    expect(detail.body.data).not.toHaveProperty('checkoutSessionId');

    const timeline = await customer
      .get(`/api/v1/orders/${CUSTOMER_PAID_ORDER_ID}/timeline`)
      .expect(200);
    expect(timeline.body.data).toEqual([
      {
        id: expect.any(String),
        previousStatus: 'PENDING_PAYMENT',
        status: 'PAID',
        reasonCode: 'PAYMENT_CONFIRMED',
        occurredAt: '2026-08-11T10:05:00.000Z',
      },
      {
        id: expect.any(String),
        previousStatus: null,
        status: 'PENDING_PAYMENT',
        reasonCode: 'ORDER_CREATED',
        occurredAt: '2026-08-11T10:00:00.000Z',
      },
    ]);
  });

  it('returns the same 404 for another owner and a missing Order', async () => {
    const customer = await createCustomerAgent();

    const crossOwner = await customer
      .get(`/api/v1/orders/${OTHER_ORDER_ID}`)
      .expect(404);
    const missing = await customer
      .get(`/api/v1/orders/${MISSING_ORDER_ID}`)
      .expect(404);
    expect(crossOwner.body).toEqual(missing.body);
    await customer.get(`/api/v1/orders/${OTHER_ORDER_ID}/timeline`).expect(404);
  });

  it('allows a Guest to read only Orders owned by its current cookie', async () => {
    await createOrderReadFixtures(prisma);
    const cookie = `apm_guest_cart=${ORDER_GUEST_TOKEN}`;

    await request(app.getHttpServer())
      .get('/api/v1/orders')
      .set('Cookie', cookie)
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toEqual([
          expect.objectContaining({ orderId: GUEST_ORDER_ID }),
        ]);
      });
    await request(app.getHttpServer())
      .get(`/api/v1/orders/${CUSTOMER_PAID_ORDER_ID}`)
      .set('Cookie', cookie)
      .expect(404);
  });

  it('rejects malformed pagination and exposes no status mutation route', async () => {
    const customer = await createCustomerAgent();

    await customer.get('/api/v1/orders?limit=51').expect(400);
    await customer.get('/api/v1/orders?cursor=invalid').expect(400);
    await customer
      .post(`/api/v1/orders/${CUSTOMER_PAID_ORDER_ID}`)
      .send({ status: 'PAID', paymentStatus: 'paid' })
      .expect(404);
    await customer
      .get(`/api/v1/orders/${CUSTOMER_PAID_ORDER_ID}`)
      .expect(200)
      .expect((response) => expect(response.body.data.status).toBe('PAID'));
  });

  async function createCustomerAgent() {
    const customer = request.agent(app.getHttpServer());
    await customer
      .post('/api/auth/sign-up/email')
      .send({
        name: 'Order Read Customer',
        email: 'http-owner@orders.test',
        password: PASSWORD,
      })
      .expect(200);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'http-owner@orders.test' },
      select: { id: true },
    });
    await createOrderReadFixtures(prisma, user.id);
    return customer;
  }
});
