import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureAuthHttp } from '../src/auth/configure-auth-http';
import { PrismaService } from '../src/prisma/prisma.service';

const PASSWORD = 'Password-12345';
const OWNER_EMAIL = 'catalog-e2e-owner@example.test';
const OTHER_EMAIL = 'catalog-e2e-other@example.test';
const MAKE_ID = '79000000-0000-4000-8000-000000000001';
const GENERATION_ID = '79000000-0000-4000-8000-000000000003';
const ENGINE_ID = '79000000-0000-4000-8000-000000000004';
const BRAND_ID = '79000000-0000-4000-8000-000000000010';
const CATEGORY_ID = '79000000-0000-4000-8000-000000000011';
const SUPPLIER_ID = '79000000-0000-4000-8000-000000000012';
const PRODUCT_ID = '79000000-0000-4000-8000-000000000020';
const HIDDEN_PRODUCT_ID = '79000000-0000-4000-8000-000000000021';

jest.setTimeout(30_000);

describe('Catalog API (e2e)', () => {
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
    await cleanFixtures(prisma);
    await createFixtures(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanFixtures(prisma);
    await app?.close();
  });

  it('serves a public product-centric catalog and excludes hidden listings', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/catalog/products?q=HTTP-SKU&currency=UAH&sort=price_asc')
      .expect(200)
      .expect((response) => {
        expect(response.body.meta).toMatchObject({
          total: 1,
          page: 1,
          pageSize: 20,
        });
        expect(response.body.data).toEqual([
          expect.objectContaining({
            id: PRODUCT_ID,
            minimumPrice: { amount: '250', currency: 'UAH' },
            variants: [
              expect.objectContaining({
                sku: 'HTTP-SKU-100',
                listings: [
                  expect.objectContaining({ condition: 'NEW', inStock: true }),
                ],
              }),
            ],
          }),
        ]);
      });
  });

  it('rejects unknown, conflicting and currency-less price queries', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/catalog/products?unexpected=value')
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/v1/catalog/products?minPrice=10')
      .expect(400);
    await request(app.getHttpServer())
      .get(
        `/api/v1/catalog/products?year=2020&generationId=${GENERATION_ID}&savedVehicleId=${GENERATION_ID}`,
      )
      .expect(400);
  });

  it('resolves an owned saved vehicle only for its authenticated owner', async () => {
    const owner = await authenticatedCustomer(app, OWNER_EMAIL);
    const other = await authenticatedCustomer(app, OTHER_EMAIL);
    const ownerUser = await prisma.user.findUniqueOrThrow({
      where: { email: OWNER_EMAIL },
    });
    const savedVehicle = await prisma.savedVehicle.create({
      data: {
        userId: ownerUser.id,
        year: 2021,
        vehicleGenerationId: GENERATION_ID,
        engineTypeId: ENGINE_ID,
      },
    });
    await prisma.user.update({
      where: { id: ownerUser.id },
      data: { activeSavedVehicleId: savedVehicle.id },
    });
    const path = `/api/v1/catalog/products?savedVehicleId=${savedVehicle.id}`;

    await request(app.getHttpServer()).get(path).expect(401);
    await other.get(path).expect(404).expect({
      statusCode: 404,
      message: 'Saved vehicle not found',
      error: 'Not Found',
    });
    await owner
      .get(path)
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toEqual([
          expect.objectContaining({ id: PRODUCT_ID }),
        ]);
      });

    await request(app.getHttpServer())
      .get(
        `/api/v1/catalog/products?year=2021&generationId=${GENERATION_ID}&engineTypeId=${ENGINE_ID}`,
      )
      .expect(200);
  });
});

async function createFixtures(prisma: PrismaService): Promise<void> {
  await prisma.vehicleMake.create({
    data: {
      id: MAKE_ID,
      name: 'Catalog E2E Make',
      models: {
        create: {
          name: 'Catalog E2E Model',
          generations: {
            create: {
              id: GENERATION_ID,
              code: 'CATALOG-E2E-GEN',
              yearFrom: 2020,
              yearTo: 2022,
              engineTypes: {
                create: {
                  id: ENGINE_ID,
                  code: 'CATALOG-E2E-ENGINE',
                  name: 'Catalog E2E Engine',
                },
              },
            },
          },
        },
      },
    },
  });
  await prisma.brand.create({
    data: { id: BRAND_ID, name: 'Catalog E2E Brand' },
  });
  await prisma.category.create({
    data: { id: CATEGORY_ID, name: 'Catalog E2E Category' },
  });
  await prisma.supplier.create({
    data: {
      id: SUPPLIER_ID,
      name: 'Catalog E2E Supplier',
      slug: 'catalog-e2e-supplier',
    },
  });
  await prisma.product.create({
    data: {
      id: PRODUCT_ID,
      name: 'Catalog HTTP Product',
      brandId: BRAND_ID,
      categoryId: CATEGORY_ID,
      variants: {
        create: {
          sku: 'HTTP-SKU-100',
          manufacturerPartNumber: 'HTTP-MPN-100',
          fitmentRules: {
            create: {
              vehicleGenerationId: GENERATION_ID,
              engineTypeId: ENGINE_ID,
            },
          },
          listings: {
            create: {
              supplierId: SUPPLIER_ID,
              status: 'ACTIVE',
              condition: 'NEW',
              price: 250,
              currency: 'UAH',
              stockQuantity: 4,
            },
          },
        },
      },
    },
  });
  await prisma.product.create({
    data: {
      id: HIDDEN_PRODUCT_ID,
      name: 'Catalog Hidden HTTP Product',
      brandId: BRAND_ID,
      variants: {
        create: {
          sku: 'HTTP-HIDDEN-100',
          manufacturerPartNumber: 'HTTP-HIDDEN-MPN',
          listings: {
            create: {
              supplierId: SUPPLIER_ID,
              status: 'PAUSED',
              condition: 'USED',
              price: 1,
              currency: 'UAH',
              stockQuantity: 2,
            },
          },
        },
      },
    },
  });
}

async function cleanFixtures(prisma: PrismaService): Promise<void> {
  const emails = [OWNER_EMAIL, OTHER_EMAIL];
  await prisma.session.deleteMany({
    where: { user: { email: { in: emails } } },
  });
  await prisma.account.deleteMany({
    where: { user: { email: { in: emails } } },
  });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.listing.deleteMany({ where: { supplierId: SUPPLIER_ID } });
  await prisma.product.deleteMany({
    where: { id: { in: [PRODUCT_ID, HIDDEN_PRODUCT_ID] } },
  });
  await prisma.supplier.deleteMany({ where: { id: SUPPLIER_ID } });
  await prisma.category.deleteMany({ where: { id: CATEGORY_ID } });
  await prisma.brand.deleteMany({ where: { id: BRAND_ID } });
  await prisma.vehicleMake.deleteMany({ where: { id: MAKE_ID } });
}

async function authenticatedCustomer(
  app: INestApplication<App>,
  email: string,
): Promise<ReturnType<typeof request.agent>> {
  const client = request.agent(app.getHttpServer());
  await client
    .post('/api/auth/sign-up/email')
    .send({ name: 'Catalog Customer', email, password: PASSWORD })
    .expect(200);
  return client;
}
