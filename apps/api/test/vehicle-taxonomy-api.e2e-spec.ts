import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureAuthHttp } from '../src/auth/configure-auth-http';
import { PrismaService } from '../src/prisma/prisma.service';

const FIXTURE_MAKE_ID = '71000000-0000-4000-8000-000000000001';

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
    await prisma.vehicleMake.deleteMany({ where: { id: FIXTURE_MAKE_ID } });
    await prisma.vehicleMake.create({
      data: {
        id: FIXTURE_MAKE_ID,
        name: 'Milestone 7 Taxonomy Make',
        models: {
          create: {
            name: 'Taxonomy Model',
            generations: {
              create: {
                code: 'T7',
                name: 'Taxonomy Generation',
                yearFrom: 2019,
                yearTo: 2021,
              },
            },
          },
        },
      },
    });
  }, 30_000);

  afterAll(async () => {
    await prisma?.vehicleMake.deleteMany({ where: { id: FIXTURE_MAKE_ID } });
    await app?.close();
  });

  it('returns supported years in descending order', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/vehicles/years')
      .expect(200)
      .expect({ data: [2021, 2020, 2019] });
  });
});
