import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureAuthHttp } from '../src/auth/configure-auth-http';
import { UserRole } from '../src/generated/prisma/enums';
import { PrismaService } from '../src/prisma/prisma.service';

const PASSWORD = 'Password-12345';
const BRAND_ID = '9b000000-0000-4000-8000-000000000001';
const CATEGORY_ID = '9b000000-0000-4000-8000-000000000002';
const PRODUCT_A_ID = '9b000000-0000-4000-8000-000000000003';
const PRODUCT_B_ID = '9b000000-0000-4000-8000-000000000004';
const VARIANT_A_ID = '9b000000-0000-4000-8000-000000000005';
const VARIANT_B_ID = '9b000000-0000-4000-8000-000000000006';
const VARIANT_C_ID = '9b000000-0000-4000-8000-000000000007';
const SUPPLIER_A_ID = '9b000000-0000-4000-8000-000000000008';
const SUPPLIER_B_ID = '9b000000-0000-4000-8000-000000000009';
const MISSING_VARIANT_ID = '9b000000-0000-4000-8000-000000000099';
const TEST_EMAILS = [
  'g2-g5-owner@example.test',
  'g2-g5-disabled@example.test',
  'g2-g5-customer@example.test',
  'g2-g5-support@example.test',
  'g2-g5-admin@example.test',
];

jest.setTimeout(30_000);

describe('Supplier frontend prerequisites API (e2e)', () => {
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

  it('returns only the current active/inactive membership or null', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/me/supplier-membership')
      .expect(401);

    const owner = await authenticatedClient(
      app,
      prisma,
      TEST_EMAILS[0],
      UserRole.SUPPLIER_USER,
      SUPPLIER_A_ID,
    );
    await owner
      .get('/api/v1/me/supplier-membership')
      .expect(200)
      .expect({
        data: {
          status: 'ACTIVE',
          supplier: {
            id: SUPPLIER_A_ID,
            name: 'Frontend prerequisite supplier A',
            slug: 'frontend-prerequisite-supplier-a',
          },
        },
      });

    const disabled = await authenticatedClient(
      app,
      prisma,
      TEST_EMAILS[1],
      UserRole.SUPPLIER_USER,
      SUPPLIER_A_ID,
      'DISABLED',
    );
    await disabled
      .get('/api/v1/me/supplier-membership')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toMatchObject({ status: 'DISABLED' });
      });

    const customer = await authenticatedClient(
      app,
      prisma,
      TEST_EMAILS[2],
      UserRole.CUSTOMER,
    );
    await customer
      .get('/api/v1/me/supplier-membership')
      .expect(200)
      .expect({ data: null });
  });

  it('searches canonical variants with guarded ownership and Admin bypass', async () => {
    const url = `/api/v1/suppliers/${SUPPLIER_A_ID}/product-variants`;
    await request(app.getHttpServer()).get(url).expect(401);

    const owner = await authenticatedClient(
      app,
      prisma,
      TEST_EMAILS[0],
      UserRole.SUPPLIER_USER,
      SUPPLIER_A_ID,
    );
    const first = await owner
      .get(`${url}?q=brake&limit=1`)
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toEqual([
          expect.objectContaining({ id: VARIANT_A_ID, sku: 'BRAKE-E2E-A' }),
        ]);
        expect(response.body.pageInfo).toEqual({
          hasNextPage: true,
          nextCursor: expect.any(String),
        });
      });
    const nextCursor: unknown = first.body.pageInfo.nextCursor;
    if (typeof nextCursor !== 'string') {
      throw new Error('Expected a product variant cursor');
    }
    await owner
      .get(`${url}?q=brake&limit=1&cursor=${encodeURIComponent(nextCursor)}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toEqual([
          expect.objectContaining({ id: VARIANT_B_ID, sku: 'BRAKE-E2E-B' }),
        ]);
        expect(response.body.pageInfo).toEqual({
          hasNextPage: false,
          nextCursor: null,
        });
      });
    await owner
      .get(`${url}/${VARIANT_A_ID}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toMatchObject({
          id: VARIANT_A_ID,
          product: {
            brand: { id: BRAND_ID },
            category: { id: CATEGORY_ID },
          },
        });
        expect(response.body.data).not.toHaveProperty('listings');
      });
    await owner.get(`${url}/${MISSING_VARIANT_ID}`).expect(404);
    await owner.get(`${url}?limit=51`).expect(400);
    await owner.get(`${url}?unexpected=true`).expect(400);
    await owner
      .get(`/api/v1/suppliers/${SUPPLIER_B_ID}/product-variants`)
      .expect(403);

    const disabled = await authenticatedClient(
      app,
      prisma,
      TEST_EMAILS[1],
      UserRole.SUPPLIER_USER,
      SUPPLIER_A_ID,
      'DISABLED',
    );
    await disabled.get(url).expect(403);

    const support = await authenticatedClient(
      app,
      prisma,
      TEST_EMAILS[3],
      UserRole.SUPPORT_MANAGER,
    );
    await support.get(url).expect(403);

    const admin = await authenticatedClient(
      app,
      prisma,
      TEST_EMAILS[4],
      UserRole.ADMIN,
    );
    await admin
      .get(`/api/v1/suppliers/${SUPPLIER_B_ID}/product-variants?q=filter`)
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toEqual([
          expect.objectContaining({ id: VARIANT_C_ID }),
        ]);
      });
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
    .send({ name: 'Supplier prerequisite user', email, password: PASSWORD })
    .expect(200);
  const user = await prisma.user.update({ where: { email }, data: { role } });
  if (supplierId) {
    await prisma.supplierUser.create({
      data: { userId: user.id, supplierId, status: membershipStatus },
    });
  }
  return client;
}

async function createFixtures(prisma: PrismaService): Promise<void> {
  await prisma.brand.create({
    data: { id: BRAND_ID, name: 'Prerequisite E2E Bosch' },
  });
  await prisma.category.create({
    data: { id: CATEGORY_ID, name: 'Prerequisite E2E Brakes' },
  });
  await prisma.product.create({
    data: {
      id: PRODUCT_A_ID,
      name: 'Brake Pad E2E',
      brandId: BRAND_ID,
      categoryId: CATEGORY_ID,
      variants: {
        create: [
          {
            id: VARIANT_A_ID,
            sku: 'BRAKE-E2E-A',
            manufacturerPartNumber: 'MPN-E2E-A',
          },
          {
            id: VARIANT_B_ID,
            sku: 'BRAKE-E2E-B',
            manufacturerPartNumber: 'MPN-E2E-B',
          },
        ],
      },
    },
  });
  await prisma.product.create({
    data: {
      id: PRODUCT_B_ID,
      name: 'Filter E2E',
      brandId: BRAND_ID,
      variants: {
        create: {
          id: VARIANT_C_ID,
          sku: 'FILTER-E2E-A',
          manufacturerPartNumber: 'MPN-FILTER-E2E-A',
        },
      },
    },
  });
  await prisma.supplier.createMany({
    data: [
      {
        id: SUPPLIER_A_ID,
        name: 'Frontend prerequisite supplier A',
        slug: 'frontend-prerequisite-supplier-a',
      },
      {
        id: SUPPLIER_B_ID,
        name: 'Frontend prerequisite supplier B',
        slug: 'frontend-prerequisite-supplier-b',
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
  await prisma.supplier.deleteMany({
    where: { id: { in: [SUPPLIER_A_ID, SUPPLIER_B_ID] } },
  });
  await prisma.product.deleteMany({
    where: { id: { in: [PRODUCT_A_ID, PRODUCT_B_ID] } },
  });
  await prisma.category.deleteMany({ where: { id: CATEGORY_ID } });
  await prisma.brand.deleteMany({ where: { id: BRAND_ID } });
}
