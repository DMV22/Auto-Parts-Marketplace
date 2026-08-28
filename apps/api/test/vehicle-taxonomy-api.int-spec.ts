import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { VehicleTaxonomyService } from '../src/vehicle-taxonomy/vehicle-taxonomy.service';

const MAKE_ID = '75000000-0000-4000-8000-000000000001';
const MODEL_ID = '75000000-0000-4000-8000-000000000002';
const GENERATION_ID = '75000000-0000-4000-8000-000000000003';
const ENGINE_ID = '75000000-0000-4000-8000-000000000004';

describe('VehicleTaxonomyService integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let service: VehicleTaxonomyService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [VehicleTaxonomyService],
    }).compile();
    await moduleRef.init();

    prisma = moduleRef.get(PrismaService);
    service = moduleRef.get(VehicleTaxonomyService);
  });

  beforeEach(async () => {
    await prisma.vehicleMake.deleteMany({ where: { id: MAKE_ID } });
    await prisma.vehicleMake.create({
      data: {
        id: MAKE_ID,
        name: 'Integration Taxonomy Make',
        models: {
          create: {
            id: MODEL_ID,
            name: 'Integration Taxonomy Model',
            generations: {
              create: {
                id: GENERATION_ID,
                code: 'INT-98',
                name: 'Integration Generation',
                yearFrom: 1998,
                yearTo: 1999,
                engineTypes: {
                  create: {
                    id: ENGINE_ID,
                    code: 'INT-ENGINE',
                    name: 'Integration Engine',
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  afterAll(async () => {
    await prisma?.vehicleMake.deleteMany({ where: { id: MAKE_ID } });
    await moduleRef?.close();
  });

  it('resolves the complete taxonomy hierarchy through Prisma', async () => {
    await expect(service.getSupportedYears()).resolves.toContain(1998);
    await expect(service.getMakes(1998)).resolves.toContainEqual({
      id: MAKE_ID,
      name: 'Integration Taxonomy Make',
    });
    await expect(service.getModels(1998, MAKE_ID)).resolves.toEqual([
      { id: MODEL_ID, name: 'Integration Taxonomy Model' },
    ]);
    await expect(service.getGenerations(1998, MODEL_ID)).resolves.toEqual([
      {
        id: GENERATION_ID,
        code: 'INT-98',
        name: 'Integration Generation',
        yearFrom: 1998,
        yearTo: 1999,
      },
    ]);
    await expect(service.getEngines(GENERATION_ID)).resolves.toEqual([
      {
        id: ENGINE_ID,
        code: 'INT-ENGINE',
        name: 'Integration Engine',
      },
    ]);
  });
});
