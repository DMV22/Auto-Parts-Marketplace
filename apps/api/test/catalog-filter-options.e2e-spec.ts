import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureAuthHttp } from '../src/auth/configure-auth-http';
import { PrismaService } from '../src/prisma/prisma.service';

const SUPPLIER_ID = '7c000000-0000-4000-8000-000000000001';
const BRAND_ID = '7c000000-0000-4000-8000-000000000002';
const CATEGORY_ID = '7c000000-0000-4000-8000-000000000003';
const PRODUCT_ID = '7c000000-0000-4000-8000-000000000004';

jest.setTimeout(30_000);

describe('Catalog filter options API (e2e)', () => {
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

  it('serves the public contract without a session and rejects query parameters', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/catalog/filter-options')
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({
          data: {
            brands: [{ id: BRAND_ID, name: 'Filter E2E Brand' }],
            categories: [{ id: CATEGORY_ID, name: 'Filter E2E Category' }],
            currencies: [
              {
                code: 'UAH',
                minimumPrice: '250',
                maximumPrice: '250',
              },
            ],
          },
          meta: { truncated: false },
        });
      });

    await request(app.getHttpServer())
      .get('/api/v1/catalog/filter-options?unexpected=value')
      .expect(400);
  });
});

async function createFixtures(prisma: PrismaService): Promise<void> {
  await prisma.brand.create({
    data: { id: BRAND_ID, name: 'Filter E2E Brand' },
  });
  await prisma.category.create({
    data: { id: CATEGORY_ID, name: 'Filter E2E Category' },
  });
  await prisma.supplier.create({
    data: {
      id: SUPPLIER_ID,
      name: 'Filter E2E Supplier',
      slug: 'filter-e2e-supplier',
    },
  });
  await prisma.product.create({
    data: {
      id: PRODUCT_ID,
      name: 'Filter E2E Product',
      brandId: BRAND_ID,
      categoryId: CATEGORY_ID,
      variants: {
        create: {
          sku: 'FILTER-E2E-SKU',
          manufacturerPartNumber: 'FILTER-E2E-MPN',
          listings: {
            create: {
              supplierId: SUPPLIER_ID,
              status: 'ACTIVE',
              condition: 'NEW',
              price: 250,
              currency: 'UAH',
              stockQuantity: 0,
            },
          },
        },
      },
    },
  });
}

async function cleanFixtures(prisma: PrismaService): Promise<void> {
  await prisma.listing.deleteMany({ where: { supplierId: SUPPLIER_ID } });
  await prisma.product.deleteMany({ where: { id: PRODUCT_ID } });
  await prisma.supplier.deleteMany({ where: { id: SUPPLIER_ID } });
  await prisma.category.deleteMany({ where: { id: CATEGORY_ID } });
  await prisma.brand.deleteMany({ where: { id: BRAND_ID } });
}
