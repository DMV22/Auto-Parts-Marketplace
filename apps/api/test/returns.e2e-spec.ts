import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureAuthHttp } from '../src/auth/configure-auth-http';
import type { UserRole } from '../src/generated/prisma/enums';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  cleanReturnFixtures,
  createReturnFixtures,
  RETURN_DELIVERED_ITEM_ID,
  RETURN_DELIVERED_ORDER_ID,
  RETURN_FOREIGN_ITEM_ID,
  RETURN_FOREIGN_ORDER_ID,
  RETURN_GUEST_ITEM_ID,
  RETURN_GUEST_ORDER_ID,
} from './returns.fixtures';

const PASSWORD = 'Password-12345';

jest.setTimeout(30_000);

describe('Customer and Support Returns API (e2e)', () => {
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
    await cleanReturnFixtures(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanReturnFixtures(prisma);
    await app?.close();
  });

  it('lets Customer create/read/cancel only an owned delivered OrderItem', async () => {
    const customer = await authenticatedActor('owner-customer', 'CUSTOMER');
    const other = await authenticatedActor('other-customer', 'CUSTOMER');
    await createReturnFixtures(prisma, {
      createUsers: false,
      customerId: customer.id,
      otherCustomerId: other.id,
    });

    await request(app.getHttpServer())
      .post(
        `/api/v1/orders/${RETURN_DELIVERED_ORDER_ID}/items/${RETURN_DELIVERED_ITEM_ID}/returns`,
      )
      .send({ reason: 'No guest self-service' })
      .expect(401);
    await customer.agent
      .post(
        `/api/v1/orders/${RETURN_FOREIGN_ORDER_ID}/items/${RETURN_FOREIGN_ITEM_ID}/returns`,
      )
      .send({ reason: 'Foreign return' })
      .expect(404);

    const created = await customer.agent
      .post(
        `/api/v1/orders/${RETURN_DELIVERED_ORDER_ID}/items/${RETURN_DELIVERED_ITEM_ID}/returns`,
      )
      .send({ reason: 'Delivered item does not fit' })
      .expect(201);
    expect(created.body.data).toMatchObject({
      orderId: RETURN_DELIVERED_ORDER_ID,
      orderItemId: RETURN_DELIVERED_ITEM_ID,
      status: 'REQUESTED',
      decisionReason: null,
    });
    expect(created.body.data).not.toHaveProperty('createdByUserId');
    expect(created.body.data).not.toHaveProperty('activityLog');

    await customer.agent
      .post(
        `/api/v1/orders/${RETURN_DELIVERED_ORDER_ID}/items/${RETURN_DELIVERED_ITEM_ID}/returns`,
      )
      .send({ reason: 'Duplicate request' })
      .expect(409);
    await customer.agent
      .get(
        `/api/v1/orders/${RETURN_DELIVERED_ORDER_ID}/items/${RETURN_DELIVERED_ITEM_ID}/returns`,
      )
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].id).toBe(created.body.data.id);
      });
    await customer.agent
      .post(
        `/api/v1/orders/${RETURN_DELIVERED_ORDER_ID}/items/${RETURN_DELIVERED_ITEM_ID}/returns/${created.body.data.id}/cancel`,
      )
      .expect(201)
      .expect((response) => {
        expect(response.body.data).toMatchObject({
          previousStatus: 'REQUESTED',
          status: 'CANCELLED',
        });
      });
  });

  it('allows Support/Admin processing while denying SupplierUser and guest self-service', async () => {
    const customer = await authenticatedActor('flow-customer', 'CUSTOMER');
    const other = await authenticatedActor('flow-other', 'CUSTOMER');
    const support = await authenticatedActor('flow-support', 'SUPPORT_MANAGER');
    const supplier = await authenticatedActor('flow-supplier', 'SUPPLIER_USER');
    const admin = await authenticatedActor('flow-admin', 'ADMIN');
    await createReturnFixtures(prisma, {
      createUsers: false,
      customerId: customer.id,
      otherCustomerId: other.id,
    });

    await request(app.getHttpServer())
      .get('/api/v1/internal/returns')
      .expect(401);
    await supplier.agent.get('/api/v1/internal/returns').expect(403);
    await admin.agent.get('/api/v1/internal/returns?limit=1').expect(200);
    await customer.agent
      .get(
        `/api/v1/orders/${RETURN_GUEST_ORDER_ID}/items/${RETURN_GUEST_ITEM_ID}/returns`,
      )
      .expect(404);

    const created = await support.agent
      .post(
        `/api/v1/internal/orders/${RETURN_GUEST_ORDER_ID}/items/${RETURN_GUEST_ITEM_ID}/returns`,
      )
      .send({ reason: 'Guest contacted support' })
      .expect(201);
    await support.agent
      .get('/api/v1/internal/returns?status=REQUESTED&limit=1')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toEqual([
          expect.objectContaining({
            id: created.body.data.id,
            productName: 'Returns Historic Brake Pad',
          }),
        ]);
      });
    await support.agent
      .get(`/api/v1/internal/returns/${created.body.data.id}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.data.customer).toEqual({ type: 'GUEST' });
        expect(response.body.data).not.toHaveProperty('guestTokenHash');
        expect(response.body.data).not.toHaveProperty('paymentEvents');
        expect(response.body.data).not.toHaveProperty('notes');
      });

    await support.agent
      .post(`/api/v1/internal/returns/${created.body.data.id}/transitions`)
      .send({ targetStatus: 'UNDER_REVIEW' })
      .expect(201);
    await support.agent
      .post(`/api/v1/internal/returns/${created.body.data.id}/transitions`)
      .send({ targetStatus: 'REJECTED' })
      .expect(400);
    await support.agent
      .post(`/api/v1/internal/returns/${created.body.data.id}/transitions`)
      .send({ targetStatus: 'REJECTED', reason: 'Outside return policy' })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.status).toBe('REJECTED');
      });
    await support.agent
      .post(`/api/v1/internal/returns/${created.body.data.id}/transitions`)
      .send({ targetStatus: 'UNDER_REVIEW' })
      .expect(409);
  });

  async function authenticatedActor(label: string, role: UserRole) {
    const agent = request.agent(app.getHttpServer());
    const email = `${label}@returns.test`;
    await agent
      .post('/api/auth/sign-up/email')
      .send({ name: `Returns ${label}`, email, password: PASSWORD })
      .expect(200);
    const user = await prisma.user.update({
      where: { email },
      data: { role },
      select: { id: true },
    });
    return { agent, id: user.id };
  }
});
