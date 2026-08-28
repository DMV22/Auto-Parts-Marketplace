import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureAuthHttp } from '../src/auth/configure-auth-http';
import type { UserRole } from '../src/generated/prisma/enums';
import { PrismaService } from '../src/prisma/prisma.service';
import { CART_SUPPLIER_ID } from './cart-api.fixtures';
import {
  cleanInternalNotesAuditFixtures,
  createInternalNotesAuditFixtures,
} from './internal-notes-audit.fixtures';
import {
  RETURN_DELIVERED_ITEM_ID,
  RETURN_DELIVERED_ORDER_ID,
} from './returns.fixtures';

const PASSWORD = 'Password-12345';

jest.setTimeout(30_000);

describe('Internal Notes and ActivityLog API (e2e)', () => {
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
    await cleanInternalNotesAuditFixtures(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanInternalNotesAuditFixtures(prisma);
    await app?.close();
  });

  it('enforces internal RBAC, append-only correction and Admin-only redaction', async () => {
    const actors = await setupActorsAndFixtures();
    const returnRequest = await actors.customer.agent
      .post(
        `/api/v1/orders/${RETURN_DELIVERED_ORDER_ID}/items/${RETURN_DELIVERED_ITEM_ID}/returns`,
      )
      .send({ reason: 'Return for internal notes test' })
      .expect(201);
    const returnId = returnRequest.body.data.id as string;

    await request(app.getHttpServer())
      .get(`/api/v1/internal/orders/${RETURN_DELIVERED_ORDER_ID}/notes`)
      .expect(401);
    await actors.customer.agent
      .get(`/api/v1/internal/orders/${RETURN_DELIVERED_ORDER_ID}/notes`)
      .expect(403);
    await actors.supplier.agent
      .get(`/api/v1/internal/orders/${RETURN_DELIVERED_ORDER_ID}/notes`)
      .expect(403);

    const original = await actors.support.agent
      .post(`/api/v1/internal/orders/${RETURN_DELIVERED_ORDER_ID}/notes`)
      .send({ body: 'Original operational context' })
      .expect(201);
    const correction = await actors.support.agent
      .post(`/api/v1/internal/orders/${RETURN_DELIVERED_ORDER_ID}/notes`)
      .send({
        body: 'Corrected operational context',
        correctsNoteId: original.body.data.id,
      })
      .expect(201);
    expect(correction.body.data.correctsNoteId).toBe(original.body.data.id);

    await actors.support.agent
      .post(`/api/v1/internal/returns/${returnId}/notes`)
      .send({
        body: 'Invalid cross-target correction',
        correctsNoteId: original.body.data.id,
      })
      .expect(404);
    await actors.support.agent
      .post(`/api/v1/internal/notes/${original.body.data.id}/redact`)
      .send({ reason: 'Support must not redact' })
      .expect(403);
    await actors.admin.agent
      .post(`/api/v1/internal/notes/${original.body.data.id}/redact`)
      .send({ reason: 'Contains unnecessary sensitive context' })
      .expect(201)
      .expect((response) => {
        expect(response.body.data).toMatchObject({
          body: null,
          isRedacted: true,
          redactionReason: 'Contains unnecessary sensitive context',
        });
      });

    await actors.support.agent
      .get(`/api/v1/internal/orders/${RETURN_DELIVERED_ORDER_ID}/notes`)
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toHaveLength(2);
        expect(response.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: original.body.data.id,
              body: null,
              isRedacted: true,
            }),
            expect.objectContaining({
              id: correction.body.data.id,
              body: 'Corrected operational context',
            }),
          ]),
        );
      });
  });

  it('scopes Support audit while allowing filtered global Admin reads', async () => {
    const actors = await setupActorsAndFixtures();
    await actors.support.agent
      .post(`/api/v1/internal/orders/${RETURN_DELIVERED_ORDER_ID}/notes`)
      .send({ body: 'Audit-visible operational note' })
      .expect(201);

    await actors.support.agent.get('/api/v1/internal/activity').expect(403);
    await actors.support.agent
      .get(
        `/api/v1/internal/activity?resourceType=ORDER&resourceId=${RETURN_DELIVERED_ORDER_ID}&limit=1`,
      )
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toEqual([
          expect.objectContaining({
            action: 'NOTE_CREATED',
            resourceType: 'ORDER',
            resourceId: RETURN_DELIVERED_ORDER_ID,
            metadata: { noteId: expect.any(String) },
          }),
        ]);
        expect(JSON.stringify(response.body)).not.toContain(
          'Audit-visible operational note',
        );
      });
    await actors.support.agent
      .get(
        `/api/v1/internal/activity?resourceType=NOTE&resourceId=${RETURN_DELIVERED_ORDER_ID}`,
      )
      .expect(403);
    await actors.admin.agent
      .get('/api/v1/internal/activity?action=NOTE_CREATED&limit=20')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toHaveLength(1);
      });
    await actors.admin.agent
      .get('/api/v1/internal/activity?unknown=value')
      .expect(400);
  });

  it('does not leak Note or ActivityLog through Customer and Supplier DTOs', async () => {
    const actors = await setupActorsAndFixtures();
    const returnRequest = await actors.customer.agent
      .post(
        `/api/v1/orders/${RETURN_DELIVERED_ORDER_ID}/items/${RETURN_DELIVERED_ITEM_ID}/returns`,
      )
      .send({ reason: 'Privacy regression return' })
      .expect(201);
    await actors.support.agent
      .post(`/api/v1/internal/orders/${RETURN_DELIVERED_ORDER_ID}/notes`)
      .send({ body: 'Never expose this internal Order note' })
      .expect(201);
    await actors.support.agent
      .post(`/api/v1/internal/returns/${returnRequest.body.data.id}/notes`)
      .send({ body: 'Never expose this internal Return note' })
      .expect(201);

    const order = await actors.customer.agent
      .get(`/api/v1/orders/${RETURN_DELIVERED_ORDER_ID}`)
      .expect(200);
    const returns = await actors.customer.agent
      .get(
        `/api/v1/orders/${RETURN_DELIVERED_ORDER_ID}/items/${RETURN_DELIVERED_ITEM_ID}/returns`,
      )
      .expect(200);
    const supplierItem = await actors.supplier.agent
      .get(
        `/api/v1/suppliers/${CART_SUPPLIER_ID}/order-items/${RETURN_DELIVERED_ITEM_ID}`,
      )
      .expect(200);

    for (const body of [order.body, returns.body, supplierItem.body]) {
      const serialized = JSON.stringify(body);
      expect(serialized).not.toContain('Never expose this internal');
      expect(serialized).not.toContain('notes');
      expect(serialized).not.toContain('activityLog');
      expect(serialized).not.toContain('actorRole');
    }
    await actors.customer.agent
      .get(`/api/v1/internal/orders/${RETURN_DELIVERED_ORDER_ID}/notes`)
      .expect(403);
    await actors.supplier.agent.get('/api/v1/internal/activity').expect(403);
  });

  async function setupActorsAndFixtures() {
    const customer = await authenticatedActor('notes-customer', 'CUSTOMER');
    const otherCustomer = await authenticatedActor(
      'notes-other-customer',
      'CUSTOMER',
    );
    const support = await authenticatedActor(
      'notes-support',
      'SUPPORT_MANAGER',
    );
    const admin = await authenticatedActor('notes-admin', 'ADMIN');
    const supplier = await authenticatedActor(
      'notes-supplier',
      'SUPPLIER_USER',
    );
    await createInternalNotesAuditFixtures(prisma, {
      createUsers: false,
      createReturn: false,
      customerId: customer.id,
      otherCustomerId: otherCustomer.id,
    });
    await prisma.supplierUser.create({
      data: {
        userId: supplier.id,
        supplierId: CART_SUPPLIER_ID,
        status: 'ACTIVE',
      },
    });
    return { customer, support, admin, supplier };
  }

  async function authenticatedActor(label: string, role: UserRole) {
    const agent = request.agent(app.getHttpServer());
    const email = `${label}@returns.test`;
    await agent
      .post('/api/auth/sign-up/email')
      .send({ name: `Internal ${label}`, email, password: PASSWORD })
      .expect(200);
    const user = await prisma.user.update({
      where: { email },
      data: { role },
      select: { id: true },
    });
    return { agent, id: user.id };
  }
});
