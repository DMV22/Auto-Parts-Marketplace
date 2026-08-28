import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureAuthHttp } from '../src/auth/configure-auth-http';
import { PrismaService } from '../src/prisma/prisma.service';

const PASSWORD = 'Password-12345';
const OWNER_EMAIL = 'garage-e2e-owner@example.test';
const OTHER_EMAIL = 'garage-e2e-other@example.test';
const MAKE_ID = '77000000-0000-4000-8000-000000000001';
const GENERATION_ID = '77000000-0000-4000-8000-000000000003';
const ENGINE_ID = '77000000-0000-4000-8000-000000000004';

jest.setTimeout(30_000);

describe('Customer Garage API (e2e)', () => {
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

    await prisma.vehicleMake.deleteMany({ where: { id: MAKE_ID } });
    await prisma.vehicleMake.create({
      data: {
        id: MAKE_ID,
        name: 'Garage E2E Make',
        models: {
          create: {
            name: 'Garage E2E Model',
            generations: {
              create: {
                id: GENERATION_ID,
                code: 'GARAGE-E2E-GEN',
                name: 'Garage E2E Generation',
                yearFrom: 2020,
                yearTo: 2022,
                engineTypes: {
                  create: {
                    id: ENGINE_ID,
                    code: 'GARAGE-E2E-ENGINE',
                    name: 'Garage E2E Engine',
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  beforeEach(async () => {
    await cleanUsers(prisma);
  });

  afterAll(async () => {
    if (prisma) {
      await cleanUsers(prisma);
      await prisma.vehicleMake.deleteMany({ where: { id: MAKE_ID } });
    }
    await app?.close();
  });

  it('requires an authenticated Customer session', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/garage/vehicles')
      .expect(401)
      .expect({
        statusCode: 401,
        message: 'Authentication required',
        error: 'Unauthorized',
      });
  });

  it('creates, lists, idempotently activates and deletes the active vehicle', async () => {
    const owner = await authenticatedCustomer(app, OWNER_EMAIL);
    const payload = {
      year: 2021,
      vehicleGenerationId: GENERATION_ID,
      engineTypeId: ENGINE_ID,
      label: 'Daily car',
    };
    const created = await owner
      .post('/api/v1/garage/vehicles')
      .send(payload)
      .expect(201);
    const savedVehicleId = created.body.data.id as string;

    expect(created.body.data).toEqual({
      id: savedVehicleId,
      year: 2021,
      label: 'Daily car',
      isActive: false,
      generation: {
        id: GENERATION_ID,
        code: 'GARAGE-E2E-GEN',
        name: 'Garage E2E Generation',
        yearFrom: 2020,
        yearTo: 2022,
        model: {
          id: expect.any(String),
          name: 'Garage E2E Model',
          make: { id: MAKE_ID, name: 'Garage E2E Make' },
        },
      },
      engine: {
        id: ENGINE_ID,
        code: 'GARAGE-E2E-ENGINE',
        name: 'Garage E2E Engine',
      },
    });

    await owner.post('/api/v1/garage/vehicles').send(payload).expect(409);
    await owner
      .get('/api/v1/garage/vehicles')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0]).toMatchObject({
          id: savedVehicleId,
          isActive: false,
        });
      });
    await owner
      .put(`/api/v1/garage/vehicles/${savedVehicleId}/active`)
      .expect(200)
      .expect((response) => {
        expect(response.body.data.isActive).toBe(true);
      });
    await owner
      .put(`/api/v1/garage/vehicles/${savedVehicleId}/active`)
      .expect(200);

    await owner.delete(`/api/v1/garage/vehicles/${savedVehicleId}`).expect(204);
    await owner.delete(`/api/v1/garage/vehicles/${savedVehicleId}`).expect(404);
    await expect(
      prisma.user.findUniqueOrThrow({
        where: { email: OWNER_EMAIL },
        select: { activeSavedVehicleId: true },
      }),
    ).resolves.toEqual({ activeSavedVehicleId: null });
  });

  it('returns the same not-found contract for missing and cross-user IDs', async () => {
    const owner = await authenticatedCustomer(app, OWNER_EMAIL);
    const other = await authenticatedCustomer(app, OTHER_EMAIL);
    const created = await owner
      .post('/api/v1/garage/vehicles')
      .send({
        year: 2020,
        vehicleGenerationId: GENERATION_ID,
        engineTypeId: null,
      })
      .expect(201);
    const savedVehicleId = created.body.data.id as string;

    const missing = await other
      .delete('/api/v1/garage/vehicles/ffffffff-ffff-4fff-8fff-ffffffffffff')
      .expect(404);
    const crossUser = await other
      .delete(`/api/v1/garage/vehicles/${savedVehicleId}`)
      .expect(404);
    expect(crossUser.body).toEqual(missing.body);
  });

  it('rejects malformed input and an out-of-range generation year', async () => {
    const owner = await authenticatedCustomer(app, OWNER_EMAIL);
    await owner
      .post('/api/v1/garage/vehicles')
      .send({
        year: 2021,
        vehicleGenerationId: GENERATION_ID,
        unexpected: true,
      })
      .expect(400);
    await owner
      .post('/api/v1/garage/vehicles')
      .send({ year: 2019, vehicleGenerationId: GENERATION_ID })
      .expect(400)
      .expect({
        statusCode: 400,
        message: 'Year is outside the vehicle generation range',
        error: 'Bad Request',
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
    .send({ name: 'Garage Customer', email, password: PASSWORD })
    .expect(200);
  return client;
}

async function cleanUsers(prisma: PrismaService): Promise<void> {
  const emails = [OWNER_EMAIL, OTHER_EMAIL];
  await prisma.session.deleteMany({
    where: { user: { email: { in: emails } } },
  });
  await prisma.account.deleteMany({
    where: { user: { email: { in: emails } } },
  });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
}
