import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureAuthHttp } from '../src/auth/configure-auth-http';
import { UserRole } from '../src/generated/prisma/enums';
import { PrismaService } from '../src/prisma/prisma.service';

const PASSWORD = 'Password-12345';
const BRAND_ID = '92000000-0000-4000-8000-000000000001';
const PRODUCT_ID = '92000000-0000-4000-8000-000000000002';
const VARIANT_ID = '92000000-0000-4000-8000-000000000003';
const SUPPLIER_A_ID = '92000000-0000-4000-8000-000000000004';
const SUPPLIER_B_ID = '92000000-0000-4000-8000-000000000005';
const OWN_LISTING_ID = '92000000-0000-4000-8000-000000000010';
const FOREIGN_LISTING_ID = '92000000-0000-4000-8000-000000000011';
const MISSING_LISTING_ID = '92000000-0000-4000-8000-000000000099';
const TEST_EMAILS = [
  'supplier-listing-owner@example.test',
  'supplier-listing-disabled@example.test',
  'supplier-listing-support@example.test',
  'supplier-listing-admin@example.test',
];

jest.setTimeout(30_000);

describe('Supplier Listings API (e2e)', () => {
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
    await cleanFixtures(prisma);
    await createFixtures(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanFixtures(prisma);
    await app?.close();
  });

  it('allows an active SupplierUser to create, list, read and update owned drafts', async () => {
    const owner = await authenticatedClient(
      app,
      prisma,
      TEST_EMAILS[0],
      UserRole.SUPPLIER_USER,
      SUPPLIER_A_ID,
    );

    const createResponse = await owner
      .post(`/api/v1/suppliers/${SUPPLIER_A_ID}/listings`)
      .send({
        productVariantId: VARIANT_ID,
        condition: 'USED',
        price: '250.50',
        currency: 'uah',
      })
      .expect(201);
    expect(createResponse.body).toMatchObject({
      supplierId: SUPPLIER_A_ID,
      status: 'DRAFT',
      stockQuantity: 0,
      price: '250.5',
      currency: 'UAH',
    });

    await owner
      .patch(
        `/api/v1/suppliers/${SUPPLIER_A_ID}/listings/${createResponse.body.id}`,
      )
      .send({ price: '199.99' })
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          id: createResponse.body.id,
          price: '199.99',
          stockQuantity: 0,
        });
      });

    await owner
      .get(
        `/api/v1/suppliers/${SUPPLIER_A_ID}/listings?status=DRAFT&condition=NEW&pageSize=1&sort=price_asc`,
      )
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0]).toMatchObject({ id: OWN_LISTING_ID });
        expect(response.body.meta).toEqual({
          pageSize: 1,
          nextCursor: null,
          sort: 'price_asc',
        });
      });
  });

  it('enforces session, role and active supplier membership with Admin bypass', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/suppliers/${SUPPLIER_A_ID}/listings`)
      .expect(401);

    const disabled = await authenticatedClient(
      app,
      prisma,
      TEST_EMAILS[1],
      UserRole.SUPPLIER_USER,
      SUPPLIER_A_ID,
      'DISABLED',
    );
    await disabled
      .get(`/api/v1/suppliers/${SUPPLIER_A_ID}/listings`)
      .expect(403);

    const support = await authenticatedClient(
      app,
      prisma,
      TEST_EMAILS[2],
      UserRole.SUPPORT_MANAGER,
    );
    await support
      .get(`/api/v1/suppliers/${SUPPLIER_A_ID}/listings`)
      .expect(403);

    const admin = await authenticatedClient(
      app,
      prisma,
      TEST_EMAILS[3],
      UserRole.ADMIN,
    );
    await admin
      .get(`/api/v1/suppliers/${SUPPLIER_B_ID}/listings`)
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toEqual([
          expect.objectContaining({ id: FOREIGN_LISTING_ID }),
        ]);
      });
  });

  it('uses non-disclosing detail errors and rejects cross-supplier route access', async () => {
    const owner = await authenticatedClient(
      app,
      prisma,
      TEST_EMAILS[0],
      UserRole.SUPPLIER_USER,
      SUPPLIER_A_ID,
    );

    await owner
      .get(`/api/v1/suppliers/${SUPPLIER_A_ID}/listings/${FOREIGN_LISTING_ID}`)
      .expect(404)
      .expect({
        statusCode: 404,
        message: 'Listing not found',
        error: 'Not Found',
      });
    await owner
      .get(`/api/v1/suppliers/${SUPPLIER_A_ID}/listings/${MISSING_LISTING_ID}`)
      .expect(404)
      .expect({
        statusCode: 404,
        message: 'Listing not found',
        error: 'Not Found',
      });
    await owner.get(`/api/v1/suppliers/${SUPPLIER_B_ID}/listings`).expect(403);
  });

  it('rejects server-owned fields, malformed queries and non-editable listings', async () => {
    const owner = await authenticatedClient(
      app,
      prisma,
      TEST_EMAILS[0],
      UserRole.SUPPLIER_USER,
      SUPPLIER_A_ID,
    );

    await owner
      .post(`/api/v1/suppliers/${SUPPLIER_A_ID}/listings`)
      .send({
        productVariantId: VARIANT_ID,
        condition: 'NEW',
        price: '10.00',
        currency: 'UAH',
        stockQuantity: 100,
      })
      .expect(400);
    await owner
      .get(`/api/v1/suppliers/${SUPPLIER_A_ID}/listings?pageSize=51`)
      .expect(400);

    await prisma.listing.update({
      where: { id: OWN_LISTING_ID },
      data: { status: 'PENDING_APPROVAL' },
    });
    await owner
      .patch(`/api/v1/suppliers/${SUPPLIER_A_ID}/listings/${OWN_LISTING_ID}`)
      .send({ price: '10.00' })
      .expect(409);
  });

  it('enforces Supplier submit and Admin-only rejection/approval lifecycle', async () => {
    const owner = await authenticatedClient(
      app,
      prisma,
      TEST_EMAILS[0],
      UserRole.SUPPLIER_USER,
      SUPPLIER_A_ID,
    );
    const support = await authenticatedClient(
      app,
      prisma,
      TEST_EMAILS[2],
      UserRole.SUPPORT_MANAGER,
    );
    const admin = await authenticatedClient(
      app,
      prisma,
      TEST_EMAILS[3],
      UserRole.ADMIN,
    );

    await owner
      .post(
        `/api/v1/suppliers/${SUPPLIER_A_ID}/listings/${OWN_LISTING_ID}/submit`,
      )
      .expect(201)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 'PENDING_APPROVAL',
          rejectionReason: null,
        });
      });
    await support
      .post(`/api/v1/admin/listings/${OWN_LISTING_ID}/approve`)
      .expect(403);
    await admin
      .post(`/api/v1/admin/listings/${OWN_LISTING_ID}/reject`)
      .send({ reason: '   ' })
      .expect(400);
    await admin
      .post(`/api/v1/admin/listings/${OWN_LISTING_ID}/reject`)
      .send({ reason: '  Missing product evidence  ' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 'REJECTED',
          rejectionReason: 'Missing product evidence',
        });
      });
    await owner
      .post(
        `/api/v1/suppliers/${SUPPLIER_A_ID}/listings/${OWN_LISTING_ID}/submit`,
      )
      .expect(201)
      .expect((response) => expect(response.body.rejectionReason).toBeNull());
    await admin
      .post(`/api/v1/admin/listings/${OWN_LISTING_ID}/approve`)
      .expect(201)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 'ACTIVE',
          rejectionReason: null,
        });
      });
    await admin
      .post(`/api/v1/admin/listings/${OWN_LISTING_ID}/approve`)
      .expect(409);
  });

  it('keeps price-only edits published and archives a Listing out of public commerce', async () => {
    const owner = await authenticatedClient(
      app,
      prisma,
      TEST_EMAILS[0],
      UserRole.SUPPLIER_USER,
      SUPPLIER_A_ID,
    );
    await prisma.listing.update({
      where: { id: OWN_LISTING_ID },
      data: { status: 'ACTIVE', stockQuantity: 5 },
    });

    await owner
      .patch(`/api/v1/suppliers/${SUPPLIER_A_ID}/listings/${OWN_LISTING_ID}`)
      .send({ price: '125.00' })
      .expect(200)
      .expect((response) => expect(response.body.status).toBe('ACTIVE'));
    await owner
      .patch(`/api/v1/suppliers/${SUPPLIER_A_ID}/listings/${OWN_LISTING_ID}`)
      .send({ condition: 'REMANUFACTURED' })
      .expect(200)
      .expect((response) =>
        expect(response.body.status).toBe('PENDING_APPROVAL'),
      );
    await owner
      .post(
        `/api/v1/suppliers/${SUPPLIER_A_ID}/listings/${OWN_LISTING_ID}/archive`,
      )
      .expect(201)
      .expect((response) => expect(response.body.status).toBe('ARCHIVED'));

    await request(app.getHttpServer())
      .get('/api/v1/catalog/products?q=SUP-E2E-A')
      .expect(200)
      .expect((response) => expect(response.body.data).toEqual([]));
    await request(app.getHttpServer())
      .get(`/api/v1/catalog/products/${PRODUCT_ID}`)
      .expect(404);
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .send({ listingId: OWN_LISTING_ID, quantity: 1 })
      .expect(404);
    await owner
      .post(
        `/api/v1/suppliers/${SUPPLIER_A_ID}/listings/${OWN_LISTING_ID}/archive`,
      )
      .expect(409);
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
    .send({ name: 'Supplier Listing User', email, password: PASSWORD })
    .expect(200);
  const user = await prisma.user.update({
    where: { email },
    data: { role },
  });
  if (supplierId) {
    await prisma.supplierUser.create({
      data: { userId: user.id, supplierId, status: membershipStatus },
    });
  }
  return client;
}

async function createFixtures(prisma: PrismaService): Promise<void> {
  await prisma.brand.create({
    data: { id: BRAND_ID, name: 'Supplier Listings E2E Brand' },
  });
  await prisma.product.create({
    data: {
      id: PRODUCT_ID,
      name: 'Supplier Listings E2E Product',
      brandId: BRAND_ID,
      variants: {
        create: {
          id: VARIANT_ID,
          sku: 'SUP-E2E-A',
          manufacturerPartNumber: 'SUP-E2E-MPN-A',
        },
      },
    },
  });
  await prisma.supplier.createMany({
    data: [
      {
        id: SUPPLIER_A_ID,
        name: 'Supplier Listings E2E A',
        slug: 'supplier-listings-e2e-a',
      },
      {
        id: SUPPLIER_B_ID,
        name: 'Supplier Listings E2E B',
        slug: 'supplier-listings-e2e-b',
      },
    ],
  });
  await prisma.listing.createMany({
    data: [
      {
        id: OWN_LISTING_ID,
        supplierId: SUPPLIER_A_ID,
        productVariantId: VARIANT_ID,
        condition: 'NEW',
        price: 100,
        currency: 'UAH',
      },
      {
        id: FOREIGN_LISTING_ID,
        supplierId: SUPPLIER_B_ID,
        productVariantId: VARIANT_ID,
        condition: 'USED',
        price: 200,
        currency: 'UAH',
      },
    ],
  });
}

async function cleanFixtures(prisma: PrismaService): Promise<void> {
  await prisma.supplierUser.deleteMany({
    where: { user: { email: { in: TEST_EMAILS } } },
  });
  await prisma.session.deleteMany({
    where: { user: { email: { in: TEST_EMAILS } } },
  });
  await prisma.account.deleteMany({
    where: { user: { email: { in: TEST_EMAILS } } },
  });
  await prisma.verification.deleteMany({
    where: { identifier: { in: TEST_EMAILS } },
  });
  await prisma.user.deleteMany({ where: { email: { in: TEST_EMAILS } } });
  await prisma.listing.deleteMany({
    where: { supplierId: { in: [SUPPLIER_A_ID, SUPPLIER_B_ID] } },
  });
  await prisma.supplier.deleteMany({
    where: { id: { in: [SUPPLIER_A_ID, SUPPLIER_B_ID] } },
  });
  await prisma.product.deleteMany({ where: { id: PRODUCT_ID } });
  await prisma.brand.deleteMany({ where: { id: BRAND_ID } });
}
