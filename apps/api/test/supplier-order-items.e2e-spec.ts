/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureAuthHttp } from '../src/auth/configure-auth-http';
import { UserRole } from '../src/generated/prisma/enums';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  AUTH_EMAILS,
  cleanSupplierOrderItemFixtures,
  createSupplierOrderItemFixtures,
  FOREIGN_ORDER_ITEM_ID,
  OWN_ORDER_ITEM_ID,
  SUPPLIER_ORDER_A_ID,
  SUPPLIER_ORDER_B_ID,
} from './supplier-order-items.fixtures';

const PASSWORD = 'Password-12345';

jest.setTimeout(30_000);

describe('Supplier OrderItems API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false });
    configureAuthHttp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanSupplierOrderItemFixtures(prisma);
    await createSupplierOrderItemFixtures(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanSupplierOrderItemFixtures(prisma);
    await app?.close();
  });

  it('returns owned safe projections and hides foreign detail', async () => {
    const owner = await authenticatedClient(
      app,
      prisma,
      AUTH_EMAILS[0],
      UserRole.SUPPLIER_USER,
      SUPPLIER_ORDER_A_ID,
    );

    await owner
      .get(`/api/v1/suppliers/${SUPPLIER_ORDER_A_ID}/order-items?status=PAID`)
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toHaveLength(2);
        expect(Object.keys(response.body.data[0]).sort()).toEqual(
          [
            'condition',
            'currency',
            'id',
            'lineTotal',
            'listingId',
            'manufacturerPartNumber',
            'orderId',
            'orderStatus',
            'orderUpdatedAt',
            'orderedAt',
            'productName',
            'quantity',
            'sku',
            'unitPrice',
          ].sort(),
        );
      });
    await owner
      .get(
        `/api/v1/suppliers/${SUPPLIER_ORDER_A_ID}/order-items/${OWN_ORDER_ITEM_ID}`,
      )
      .expect(200)
      .expect((response) => expect(response.body.id).toBe(OWN_ORDER_ITEM_ID));
    await owner
      .get(
        `/api/v1/suppliers/${SUPPLIER_ORDER_A_ID}/order-items/${FOREIGN_ORDER_ITEM_ID}`,
      )
      .expect(404)
      .expect({
        statusCode: 404,
        message: 'Order item not found',
        error: 'Not Found',
      });
  });

  it('enforces session, role, active membership and explicit Admin bypass', async () => {
    const route = `/api/v1/suppliers/${SUPPLIER_ORDER_A_ID}/order-items`;
    await request(app.getHttpServer()).get(route).expect(401);

    const disabled = await authenticatedClient(
      app,
      prisma,
      AUTH_EMAILS[1],
      UserRole.SUPPLIER_USER,
      SUPPLIER_ORDER_A_ID,
      'DISABLED',
    );
    await disabled.get(route).expect(403);

    const support = await authenticatedClient(
      app,
      prisma,
      AUTH_EMAILS[2],
      UserRole.SUPPORT_MANAGER,
    );
    await support.get(route).expect(403);

    const owner = await authenticatedClient(
      app,
      prisma,
      AUTH_EMAILS[0],
      UserRole.SUPPLIER_USER,
      SUPPLIER_ORDER_A_ID,
    );
    await owner
      .get(`/api/v1/suppliers/${SUPPLIER_ORDER_B_ID}/order-items`)
      .expect(403);

    const admin = await authenticatedClient(
      app,
      prisma,
      AUTH_EMAILS[3],
      UserRole.ADMIN,
    );
    await admin
      .get(`/api/v1/suppliers/${SUPPLIER_ORDER_B_ID}/order-items`)
      .expect(200)
      .expect((response) => expect(response.body.data).toHaveLength(2));
  });

  it('validates allowlisted filters, date ranges and pagination bounds', async () => {
    const owner = await authenticatedClient(
      app,
      prisma,
      AUTH_EMAILS[0],
      UserRole.SUPPLIER_USER,
      SUPPLIER_ORDER_A_ID,
    );
    const route = `/api/v1/suppliers/${SUPPLIER_ORDER_A_ID}/order-items`;

    await owner.get(`${route}?pageSize=51`).expect(400);
    await owner.get(`${route}?status=REFUNDED`).expect(400);
    await owner
      .get(
        `${route}?createdFrom=2026-08-12T00%3A00%3A00.000Z&createdTo=2026-08-11T00%3A00%3A00.000Z`,
      )
      .expect(400);
    await owner.get(`${route}?customerId=private`).expect(400);
  });
});

async function authenticatedClient(
  app: INestApplication<App>,
  prisma: PrismaService,
  email: string,
  role: UserRole,
  supplierId?: string,
  membershipStatus: 'ACTIVE' | 'DISABLED' = 'ACTIVE',
): Promise<ReturnType<typeof request.agent>> {
  const client = request.agent(app.getHttpServer());
  await client
    .post('/api/auth/sign-up/email')
    .send({ name: 'Supplier Order Item User', email, password: PASSWORD })
    .expect(200);
  const user = await prisma.user.update({ where: { email }, data: { role } });
  if (supplierId) {
    await prisma.supplierUser.create({
      data: { userId: user.id, supplierId, status: membershipStatus },
    });
  }
  return client;
}
