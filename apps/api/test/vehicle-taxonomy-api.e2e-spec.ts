import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureAuthHttp } from '../src/auth/configure-auth-http';
import { PrismaService } from '../src/prisma/prisma.service';

const FIXTURE_MAKE_ID = '71000000-0000-4000-8000-000000000001';
const SECOND_MAKE_ID = '71000000-0000-4000-8000-000000000002';
const FIXTURE_MODEL_ID = '72000000-0000-4000-8000-000000000001';
const SECOND_MODEL_ID = '72000000-0000-4000-8000-000000000002';
const FIXTURE_GENERATION_ID = '73000000-0000-4000-8000-000000000001';
const SECOND_GENERATION_ID = '73000000-0000-4000-8000-000000000002';
const FIRST_ENGINE_ID = '74000000-0000-4000-8000-000000000001';
const SECOND_ENGINE_ID = '74000000-0000-4000-8000-000000000002';
const MISSING_RESOURCE_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

describe('Vehicle taxonomy API (e2e)', () => {
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
    await prisma.vehicleMake.deleteMany({
      where: { id: { in: [FIXTURE_MAKE_ID, SECOND_MAKE_ID] } },
    });
    await prisma.vehicleMake.create({
      data: {
        id: FIXTURE_MAKE_ID,
        name: 'Milestone 7 Taxonomy Make',
        models: {
          create: [
            {
              id: FIXTURE_MODEL_ID,
              name: 'Taxonomy Model',
              generations: {
                create: [
                  {
                    id: FIXTURE_GENERATION_ID,
                    code: 'T7',
                    name: 'Taxonomy Generation',
                    yearFrom: 2019,
                    yearTo: 2021,
                    engineTypes: {
                      create: [
                        {
                          id: FIRST_ENGINE_ID,
                          code: 'T7-20',
                          name: '2.0 Turbo',
                        },
                        {
                          id: SECOND_ENGINE_ID,
                          code: 'T7-15',
                          name: '1.5 Turbo',
                        },
                      ],
                    },
                  },
                  {
                    id: SECOND_GENERATION_ID,
                    code: 'A7',
                    name: 'Earlier Code Generation',
                    yearFrom: 2020,
                    yearTo: 2020,
                  },
                ],
              },
            },
            {
              id: SECOND_MODEL_ID,
              name: 'Alpha Model',
              generations: {
                create: {
                  code: 'ALPHA',
                  yearFrom: 2020,
                  yearTo: 2020,
                },
              },
            },
          ],
        },
      },
    });
    await prisma.vehicleMake.create({
      data: {
        id: SECOND_MAKE_ID,
        name: 'Alpha Taxonomy Make',
        models: {
          create: {
            name: 'Second Taxonomy Model',
            generations: {
              create: {
                code: 'T7-SECOND',
                yearFrom: 2020,
                yearTo: 2020,
              },
            },
          },
        },
      },
    });
  }, 30_000);

  afterAll(async () => {
    await prisma?.vehicleMake.deleteMany({
      where: { id: { in: [FIXTURE_MAKE_ID, SECOND_MAKE_ID] } },
    });
    await app?.close();
  });

  it('returns supported years in descending order', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/vehicles/years')
      .expect(200)
      .expect({ data: [2021, 2020, 2019] });
  });

  it('returns makes available for the selected year in stable order', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/vehicles/makes?year=2020')
      .expect(200)
      .expect({
        data: [
          { id: SECOND_MAKE_ID, name: 'Alpha Taxonomy Make' },
          { id: FIXTURE_MAKE_ID, name: 'Milestone 7 Taxonomy Make' },
        ],
      });
  });

  it('returns models for the selected make and year in stable order', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/vehicles/models?year=2020&makeId=${FIXTURE_MAKE_ID}`)
      .expect(200)
      .expect({
        data: [
          { id: SECOND_MODEL_ID, name: 'Alpha Model' },
          { id: FIXTURE_MODEL_ID, name: 'Taxonomy Model' },
        ],
      });
  });

  it('returns generations for the selected model and year in stable order', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/vehicles/generations?year=2020&modelId=${FIXTURE_MODEL_ID}`)
      .expect(200)
      .expect({
        data: [
          {
            id: SECOND_GENERATION_ID,
            code: 'A7',
            name: 'Earlier Code Generation',
            yearFrom: 2020,
            yearTo: 2020,
          },
          {
            id: FIXTURE_GENERATION_ID,
            code: 'T7',
            name: 'Taxonomy Generation',
            yearFrom: 2019,
            yearTo: 2021,
          },
        ],
      });
  });

  it('returns engines for the selected generation in stable order', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/vehicles/engines?generationId=${FIXTURE_GENERATION_ID}`)
      .expect(200)
      .expect({
        data: [
          { id: SECOND_ENGINE_ID, code: 'T7-15', name: '1.5 Turbo' },
          { id: FIRST_ENGINE_ID, code: 'T7-20', name: '2.0 Turbo' },
        ],
      });
  });

  it('returns an empty collection when an existing parent has no matches', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/vehicles/models?year=2019&makeId=${SECOND_MAKE_ID}`)
      .expect(200)
      .expect({ data: [] });
  });

  it('rejects malformed and unknown query parameters', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/vehicles/makes?year=2020&unexpected=value')
      .expect(400)
      .expect({
        statusCode: 400,
        message: 'Unknown query parameter: unexpected',
        error: 'Bad Request',
      });

    await request(app.getHttpServer())
      .get('/api/v1/vehicles/models?year=2020&makeId=not-a-uuid')
      .expect(400)
      .expect({
        statusCode: 400,
        message: 'makeId must be a UUID',
        error: 'Bad Request',
      });
  });

  it.each([
    {
      path: `/api/v1/vehicles/models?year=2020&makeId=${MISSING_RESOURCE_ID}`,
      message: 'Vehicle make not found',
    },
    {
      path: `/api/v1/vehicles/generations?year=2020&modelId=${MISSING_RESOURCE_ID}`,
      message: 'Vehicle model not found',
    },
    {
      path: `/api/v1/vehicles/engines?generationId=${MISSING_RESOURCE_ID}`,
      message: 'Vehicle generation not found',
    },
  ])(
    'returns not found when a requested parent resource does not exist',
    async ({ path, message }) => {
      await request(app.getHttpServer()).get(path).expect(404).expect({
        statusCode: 404,
        message,
        error: 'Not Found',
      });
    },
  );
});
