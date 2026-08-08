import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureAuthHttp } from '../src/auth/configure-auth-http';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  cleanProductDetailFixtures,
  createProductDetailFixtures,
  PDP,
} from './product-detail.fixtures';

const PASSWORD = 'Password-12345';

jest.setTimeout(30_000);

describe('Product detail API (e2e)', () => {
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
    await cleanProductDetailFixtures(prisma);
    await createProductDetailFixtures(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanProductDetailFixtures(prisma);
    await app?.close();
  });

  it('returns the public PDP projection without leaking hidden listings or stock', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/catalog/products/${PDP.productId}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toMatchObject({
          id: PDP.productId,
          brand: { id: PDP.brandId, name: 'PDP Test Brand' },
          category: { id: PDP.categoryId, name: 'PDP Test Category' },
        });
        expect(response.body.data.variants).toHaveLength(4);
        expect(
          response.body.data.variants.map(({ id }: { id: string }) => id),
        ).not.toContain(PDP.hiddenVariantId);
        const exactVariant = response.body.data.variants.find(
          ({ id }: { id: string }) => id === PDP.exactVariantId,
        );
        expect(exactVariant).toMatchObject({
          fitment: {
            status: 'unknown',
            reasonCode: 'VEHICLE_NOT_SELECTED',
            matchedRule: null,
          },
          listings: [
            expect.objectContaining({
              price: '110',
              inStock: true,
              supplier: {
                id: PDP.supplierId,
                name: 'PDP Public Supplier',
                slug: 'pdp-public-supplier',
              },
            }),
          ],
        });
        expect(exactVariant.listings[0]).not.toHaveProperty('stockQuantity');
      });
  });

  it('returns stable exact-engine and partial-selection fitment answers', async () => {
    const explicitPath =
      `/api/v1/catalog/products/${PDP.productId}` +
      `?year=2020&generationId=${PDP.generationId}&engineTypeId=${PDP.engineId}`;
    await request(app.getHttpServer())
      .get(explicitPath)
      .expect(200)
      .expect((response) => {
        const exact = response.body.data.variants.find(
          ({ id }: { id: string }) => id === PDP.exactVariantId,
        );
        const generation = response.body.data.variants.find(
          ({ id }: { id: string }) => id === PDP.generationVariantId,
        );
        expect(exact.fitment).toMatchObject({
          status: 'incompatible',
          reasonCode: 'EXACT_ENGINE_EXCLUSION',
          matchedRule: { scope: 'ENGINE', engineTypeId: PDP.engineId },
        });
        expect(generation.fitment).toMatchObject({
          status: 'compatible',
          reasonCode: 'GENERATION_MATCH',
        });
      });

    await request(app.getHttpServer())
      .get(
        `/api/v1/catalog/products/${PDP.productId}` +
          `?year=2020&generationId=${PDP.generationId}`,
      )
      .expect(200)
      .expect((response) => {
        const engineOnly = response.body.data.variants.find(
          ({ id }: { id: string }) => id === PDP.engineOnlyVariantId,
        );
        expect(engineOnly.fitment).toEqual({
          status: 'caution',
          reasonCode: 'ENGINE_REQUIRED',
          matchedRule: null,
        });
      });
  });

  it('allows owner-only saved vehicle context', async () => {
    const owner = await authenticatedCustomer(app, PDP.ownerEmail);
    const other = await authenticatedCustomer(app, PDP.otherEmail);
    const ownerUser = await prisma.user.findUniqueOrThrow({
      where: { email: PDP.ownerEmail },
    });
    const savedVehicle = await prisma.savedVehicle.create({
      data: {
        userId: ownerUser.id,
        year: 2020,
        vehicleGenerationId: PDP.generationId,
        engineTypeId: PDP.engineId,
      },
    });
    const path =
      `/api/v1/catalog/products/${PDP.productId}` +
      `?savedVehicleId=${savedVehicle.id}`;

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
        const exactVariant = response.body.data.variants.find(
          ({ id }: { id: string }) => id === PDP.exactVariantId,
        );
        expect(exactVariant.fitment).toMatchObject({
          status: 'incompatible',
          reasonCode: 'EXACT_ENGINE_EXCLUSION',
        });
      });
  });

  it('distinguishes invalid context, missing product and unavailable product', async () => {
    await request(app.getHttpServer())
      .get(
        `/api/v1/catalog/products/${PDP.productId}` +
          `?year=2022&generationId=${PDP.generationId}`,
      )
      .expect(400)
      .expect({
        statusCode: 400,
        message: 'Year is outside the vehicle generation range',
        error: 'Bad Request',
      });
    await request(app.getHttpServer())
      .get('/api/v1/catalog/products/7a000000-0000-4000-8000-000000000099')
      .expect(404)
      .expect({
        statusCode: 404,
        message: 'Product not found',
        error: 'Not Found',
      });
    await request(app.getHttpServer())
      .get(`/api/v1/catalog/products/${PDP.unavailableProductId}`)
      .expect(404)
      .expect({
        statusCode: 404,
        message: 'Product is not publicly available',
        error: 'Not Found',
      });
  });
});

async function authenticatedCustomer(
  app: INestApplication<App>,
  email: string,
): Promise<ReturnType<typeof request.agent>> {
  const client = request.agent(app.getHttpServer());
  await client
    .post('/api/auth/sign-up/email')
    .send({ name: 'PDP Customer', email, password: PASSWORD })
    .expect(200);
  return client;
}
