import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureAuthHttp } from '../src/auth/configure-auth-http';
import type { UserRole } from '../src/generated/prisma/enums';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  cleanInternalOrderFixtures,
  createInternalOrderFixtures,
  INTERNAL_EXPIRED_ORDER_ID,
  INTERNAL_GUEST_ORDER_ID,
  INTERNAL_PAID_ORDER_ID,
} from './internal-orders.fixtures';

const PASSWORD = 'Password-12345';
const MISSING_ORDER_ID = 'b2000000-0000-4000-8000-000000000099';

jest.setTimeout(30_000);

describe('Internal OMS Orders API (e2e)', () => {
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
    await cleanInternalOrderFixtures(prisma);
    await createInternalOrderFixtures(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanInternalOrderFixtures(prisma);
    await app?.close();
  });

  it('requires SupportManager/Admin while denying Customer and SupplierUser', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/internal/orders')
      .expect(401);
    const customer = await authenticatedAgent('rbac-customer', 'CUSTOMER');
    const supplier = await authenticatedAgent('rbac-supplier', 'SUPPLIER_USER');
    const support = await authenticatedAgent('rbac-support', 'SUPPORT_MANAGER');
    const admin = await authenticatedAgent('rbac-admin', 'ADMIN');

    await customer.get('/api/v1/internal/orders').expect(403);
    await supplier.get('/api/v1/internal/orders').expect(403);
    await support.get('/api/v1/internal/orders?limit=1').expect(200);
    await admin
      .get(`/api/v1/internal/orders/${INTERNAL_PAID_ORDER_ID}`)
      .expect(200);
  });

  it('returns filtered queue and privacy-safe Customer/Guest details', async () => {
    const support = await authenticatedAgent(
      'queue-support',
      'SUPPORT_MANAGER',
    );
    const queue = await support
      .get('/api/v1/internal/orders?paymentOutcome=FAILED_OR_EXPIRED&limit=1')
      .expect(200);
    expect(queue.body).toEqual({
      data: [
        expect.objectContaining({
          orderId: INTERNAL_EXPIRED_ORDER_ID,
          paymentOutcome: 'FAILED_OR_EXPIRED',
          customerName: 'Internal Orders Customer',
        }),
      ],
      pageInfo: { nextCursor: null, hasNextPage: false },
    });

    const customerDetail = await support
      .get(`/api/v1/internal/orders/${INTERNAL_PAID_ORDER_ID}`)
      .expect(200);
    expect(customerDetail.body.data).toMatchObject({
      customer: {
        type: 'CUSTOMER',
        name: 'Internal Orders Customer',
        email: 'customer@internal-orders.test',
      },
      items: [
        {
          productName: 'Internal Historic Brake Pad',
          lineTotal: '250.00',
        },
      ],
    });
    expect(customerDetail.body.data).not.toHaveProperty('guestTokenHash');
    expect(customerDetail.body.data).not.toHaveProperty('paymentEvents');
    expect(customerDetail.body.data).not.toHaveProperty('checkoutSessionId');
    expect(customerDetail.body.data).not.toHaveProperty('addresses');

    const guestDetail = await support
      .get(`/api/v1/internal/orders/${INTERNAL_GUEST_ORDER_ID}`)
      .expect(200);
    expect(guestDetail.body.data.customer).toEqual({ type: 'GUEST' });
  });

  it('allows an OMS transition but rejects payment, skipped and unknown targets', async () => {
    const support = await authenticatedAgent(
      'transition-support',
      'SUPPORT_MANAGER',
    );
    await support
      .post(`/api/v1/internal/orders/${INTERNAL_PAID_ORDER_ID}/transitions`)
      .send({ targetStatus: 'PROCESSING', reason: 'Prepared by support' })
      .expect(201)
      .expect((response) => {
        expect(response.body.data).toMatchObject({
          previousStatus: 'PAID',
          status: 'PROCESSING',
        });
      });
    await support
      .post(`/api/v1/internal/orders/${INTERNAL_PAID_ORDER_ID}/transitions`)
      .send({ targetStatus: 'DELIVERED' })
      .expect(409);
    await support
      .post(`/api/v1/internal/orders/${INTERNAL_PAID_ORDER_ID}/transitions`)
      .send({ targetStatus: 'PAID' })
      .expect(400);
    await support
      .post(`/api/v1/internal/orders/${MISSING_ORDER_ID}/transitions`)
      .send({ targetStatus: 'PROCESSING' })
      .expect(404);

    await expect(
      prisma.paymentEvent.findMany({
        where: { orderId: INTERNAL_PAID_ORDER_ID },
      }),
    ).resolves.toHaveLength(1);
  });

  it('validates filters and returns the shared public timeline projection', async () => {
    const admin = await authenticatedAgent('timeline-admin', 'ADMIN');
    await admin.get('/api/v1/internal/orders?limit=51').expect(400);
    await admin.get('/api/v1/internal/orders?unknown=value').expect(400);
    await admin
      .get('/api/v1/internal/orders?createdFrom=2026-08-14')
      .expect(400);

    await admin
      .get(`/api/v1/internal/orders/${INTERNAL_PAID_ORDER_ID}/timeline`)
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toEqual([
          {
            id: expect.any(String),
            previousStatus: 'PENDING_PAYMENT',
            status: 'PAID',
            reasonCode: 'PAYMENT_CONFIRMED',
            occurredAt: '2026-08-14T10:05:00.000Z',
          },
          {
            id: expect.any(String),
            previousStatus: null,
            status: 'PENDING_PAYMENT',
            reasonCode: 'ORDER_CREATED',
            occurredAt: '2026-08-14T10:00:00.000Z',
          },
        ]);
      });
  });

  async function authenticatedAgent(label: string, role: UserRole) {
    const agent = request.agent(app.getHttpServer());
    const email = `${label}@internal-orders.test`;
    await agent
      .post('/api/auth/sign-up/email')
      .send({ name: `Internal ${label}`, email, password: PASSWORD })
      .expect(200);
    await prisma.user.update({ where: { email }, data: { role } });
    return agent;
  }
});
