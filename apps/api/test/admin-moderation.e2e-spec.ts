import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureAuthHttp } from '../src/auth/configure-auth-http';
import type { UserRole } from '../src/generated/prisma/enums';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  cleanAdminModerationFixtures,
  createAdminModerationFixtures,
  MODERATION_ACTIVE_ID,
  MODERATION_PENDING_A_ID,
  MODERATION_PENDING_B_ID,
  MODERATION_PRODUCT_ID,
  MODERATION_SUPPLIER_ID,
} from './admin-moderation.fixtures';

const PASSWORD = 'Password-12345';

jest.setTimeout(30_000);

describe('Admin Listing moderation API (e2e)', () => {
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
    await cleanAdminModerationFixtures(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanAdminModerationFixtures(prisma);
    await app?.close();
  });

  it('exposes a bounded Admin-only queue and denies implicit Support moderation', async () => {
    const actors = await setupActorsAndFixtures();
    await request(app.getHttpServer())
      .get('/api/v1/admin/moderation/listings')
      .expect(401);
    await actors.support.get('/api/v1/admin/moderation/listings').expect(403);
    await actors.owner.get('/api/v1/admin/moderation/listings').expect(403);

    const first = await actors.admin
      .get('/api/v1/admin/moderation/listings?pageSize=1')
      .expect(200);
    expect(first.body.data).toEqual([
      expect.objectContaining({
        id: MODERATION_PENDING_A_ID,
        supplier: { id: MODERATION_SUPPLIER_ID, name: expect.any(String) },
      }),
    ]);
    expect(first.body.meta).toEqual({
      pageSize: 1,
      nextCursor: expect.any(String),
    });
    await actors.admin
      .get(
        `/api/v1/admin/moderation/listings?pageSize=1&cursor=${first.body.meta.nextCursor}`,
      )
      .expect(200)
      .expect((response) => {
        expect(response.body.data.map(({ id }: { id: string }) => id)).toEqual([
          MODERATION_PENDING_B_ID,
        ]);
      });
    await actors.admin
      .get('/api/v1/admin/moderation/listings?pageSize=51')
      .expect(400);
    await actors.admin
      .get('/api/v1/admin/moderation/listings?customerId=private')
      .expect(400);
  });

  it('audits approve/reject/emergency pause and exposes reasons only to Supplier/Admin', async () => {
    const actors = await setupActorsAndFixtures();
    await actors.admin
      .post(
        `/api/v1/admin/moderation/listings/${MODERATION_PENDING_A_ID}/reject`,
      )
      .send({ reason: '  Missing manufacturer evidence  ' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 'REJECTED',
          rejectionReason: 'Missing manufacturer evidence',
          moderationReason: null,
        });
      });
    await actors.admin
      .post(
        `/api/v1/admin/moderation/listings/${MODERATION_PENDING_B_ID}/approve`,
      )
      .expect(201);
    await actors.admin
      .post(`/api/v1/admin/moderation/listings/${MODERATION_ACTIVE_ID}/pause`)
      .send({ reason: '  Emergency safety review  ' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 'PAUSED',
          moderationReason: 'Emergency safety review',
        });
      });

    await actors.owner
      .get(
        `/api/v1/suppliers/${MODERATION_SUPPLIER_ID}/listings/${MODERATION_ACTIVE_ID}`,
      )
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 'PAUSED',
          moderationReason: 'Emergency safety review',
        });
        expect(response.body).not.toHaveProperty('activityLog');
      });
    await actors.owner
      .post(
        `/api/v1/suppliers/${MODERATION_SUPPLIER_ID}/listings/${MODERATION_ACTIVE_ID}/resume`,
      )
      .expect(409);
    await actors.owner
      .patch(
        `/api/v1/suppliers/${MODERATION_SUPPLIER_ID}/listings/${MODERATION_ACTIVE_ID}`,
      )
      .send({ moderationReason: null, status: 'ACTIVE' })
      .expect(400);

    await actors.admin
      .get('/api/v1/internal/activity?resourceType=LISTING&limit=20')
      .expect(200)
      .expect((response) => {
        const fixtureLogs = response.body.data.filter(
          ({ resourceId }: { resourceId: string }) =>
            [
              MODERATION_PENDING_A_ID,
              MODERATION_PENDING_B_ID,
              MODERATION_ACTIVE_ID,
            ].includes(resourceId),
        );
        expect(fixtureLogs).toHaveLength(3);
        expect(JSON.stringify(response.body)).not.toContain('productName');
      });
  });

  it('keeps pending/paused Listings out of PDP and Cart while preserving audited legacy aliases', async () => {
    const actors = await setupActorsAndFixtures();
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .send({ listingId: MODERATION_PENDING_A_ID, quantity: 1 })
      .expect(404);
    await actors.admin
      .post(`/api/v1/admin/listings/${MODERATION_PENDING_A_ID}/approve`)
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .send({ listingId: MODERATION_PENDING_A_ID, quantity: 1 })
      .expect(201);
    await actors.admin
      .post(
        `/api/v1/admin/moderation/listings/${MODERATION_PENDING_A_ID}/pause`,
      )
      .send({ reason: 'Emergency compatibility concern' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .send({ listingId: MODERATION_PENDING_A_ID, quantity: 1 })
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/v1/catalog/products/${MODERATION_PRODUCT_ID}`)
      .expect(200)
      .expect((response) => {
        const ids = response.body.data.variants.flatMap(
          (variant: { listings: Array<{ id: string }> }) =>
            variant.listings.map(({ id }) => id),
        );
        expect(ids).toContain(MODERATION_ACTIVE_ID);
        expect(ids).not.toContain(MODERATION_PENDING_A_ID);
        expect(ids).not.toContain(MODERATION_PENDING_B_ID);
      });
    await expect(
      prisma.activityLog.count({
        where: {
          resourceType: 'LISTING',
          resourceId: MODERATION_PENDING_A_ID,
        },
      }),
    ).resolves.toBe(2);
  });

  async function setupActorsAndFixtures() {
    const admin = await authenticatedAgent('admin', 'ADMIN');
    const support = await authenticatedAgent('support', 'SUPPORT_MANAGER');
    const owner = await authenticatedAgent('owner', 'SUPPLIER_USER');
    await createAdminModerationFixtures(prisma, { createUsers: false });
    const ownerUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'owner@moderation.test' },
      select: { id: true },
    });
    await prisma.supplierUser.create({
      data: {
        userId: ownerUser.id,
        supplierId: MODERATION_SUPPLIER_ID,
        status: 'ACTIVE',
      },
    });
    return { admin, support, owner };
  }

  async function authenticatedAgent(label: string, role: UserRole) {
    const agent = request.agent(app.getHttpServer());
    const email = `${label}@moderation.test`;
    await agent
      .post('/api/auth/sign-up/email')
      .send({ name: `Moderation ${label}`, email, password: PASSWORD })
      .expect(200);
    await prisma.user.update({ where: { email }, data: { role } });
    return agent;
  }
});
