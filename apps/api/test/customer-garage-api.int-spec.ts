import 'dotenv/config';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GarageService } from '../src/garage/garage.service';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

const MAKE_ID = '76000000-0000-4000-8000-000000000001';
const GENERATION_ID = '76000000-0000-4000-8000-000000000003';
const ENGINE_ID = '76000000-0000-4000-8000-000000000004';
const OTHER_ENGINE_ID = '76000000-0000-4000-8000-000000000005';

describe('GarageService integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let service: GarageService;
  let ownerId: string;
  let otherUserId: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [GarageService],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    service = moduleRef.get(GarageService);
  });

  beforeEach(async () => {
    await cleanFixtures(prisma);
    const [owner, otherUser] = await Promise.all([
      prisma.user.create({
        data: { name: 'Garage Owner', email: 'garage-owner@example.test' },
      }),
      prisma.user.create({
        data: { name: 'Other Owner', email: 'garage-other@example.test' },
      }),
    ]);
    ownerId = owner.id;
    otherUserId = otherUser.id;
    await prisma.vehicleMake.create({
      data: {
        id: MAKE_ID,
        name: 'Garage Make',
        models: {
          create: {
            name: 'Garage Model',
            generations: {
              create: {
                id: GENERATION_ID,
                code: 'GARAGE-GEN',
                name: 'Garage Generation',
                yearFrom: 2019,
                yearTo: 2021,
                engineTypes: {
                  create: {
                    id: ENGINE_ID,
                    code: 'GARAGE-ENGINE',
                    name: 'Garage Engine',
                  },
                },
              },
            },
          },
        },
      },
    });
    await prisma.vehicleMake.create({
      data: {
        name: 'Other Garage Make',
        models: {
          create: {
            name: 'Other Garage Model',
            generations: {
              create: {
                code: 'OTHER-GEN',
                yearFrom: 2020,
                yearTo: 2020,
                engineTypes: {
                  create: {
                    id: OTHER_ENGINE_ID,
                    code: 'OTHER-ENGINE',
                    name: 'Other Engine',
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
    if (prisma) {
      await cleanFixtures(prisma);
    }
    await moduleRef.close();
  });

  it('creates, reads, activates and deletes an exact owned vehicle', async () => {
    const saved = await service.create(ownerId, {
      year: 2020,
      vehicleGenerationId: GENERATION_ID,
      engineTypeId: ENGINE_ID,
      label: 'Daily car',
    });

    await expect(service.list(ownerId)).resolves.toEqual([
      expect.objectContaining({ id: saved.id, year: 2020, isActive: false }),
    ]);
    await expect(service.activate(ownerId, saved.id)).resolves.toEqual(
      expect.objectContaining({ id: saved.id, isActive: true }),
    );
    await expect(service.activate(ownerId, saved.id)).resolves.toEqual(
      expect.objectContaining({ id: saved.id, isActive: true }),
    );

    await service.remove(ownerId, saved.id);
    await expect(service.list(ownerId)).resolves.toEqual([]);
    await expect(
      prisma.user.findUniqueOrThrow({
        where: { id: ownerId },
        select: { activeSavedVehicleId: true },
      }),
    ).resolves.toEqual({ activeSavedVehicleId: null });
    await expect(service.remove(ownerId, saved.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects duplicates and inconsistent taxonomy without writing rows', async () => {
    const input = {
      year: 2020,
      vehicleGenerationId: GENERATION_ID,
      engineTypeId: ENGINE_ID,
      label: null,
    };
    await service.create(ownerId, input);
    await expect(service.create(ownerId, input)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(
      service.create(ownerId, { ...input, year: 2022 }),
    ).rejects.toThrow('Year is outside the vehicle generation range');
    await expect(
      service.create(ownerId, { ...input, engineTypeId: OTHER_ENGINE_ID }),
    ).rejects.toThrow('Engine does not belong to vehicle generation');
    await expect(
      prisma.savedVehicle.count({ where: { userId: ownerId } }),
    ).resolves.toBe(1);
  });

  it('does not reveal or mutate another user garage and keeps one active pointer', async () => {
    const first = await service.create(ownerId, {
      year: 2019,
      vehicleGenerationId: GENERATION_ID,
      engineTypeId: null,
      label: null,
    });
    const second = await service.create(ownerId, {
      year: 2021,
      vehicleGenerationId: GENERATION_ID,
      engineTypeId: null,
      label: null,
    });

    await Promise.all([
      service.activate(ownerId, first.id),
      service.activate(ownerId, second.id),
    ]);
    const active = await prisma.user.findUniqueOrThrow({
      where: { id: ownerId },
      select: { activeSavedVehicleId: true },
    });
    expect([first.id, second.id]).toContain(active.activeSavedVehicleId);

    await expect(
      service.activate(otherUserId, first.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(otherUserId, first.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

async function cleanFixtures(prisma: PrismaService): Promise<void> {
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.savedVehicle.deleteMany({
    where: {
      user: {
        email: {
          in: ['garage-owner@example.test', 'garage-other@example.test'],
        },
      },
    },
  });
  await prisma.user.deleteMany({
    where: {
      email: { in: ['garage-owner@example.test', 'garage-other@example.test'] },
    },
  });
  await prisma.vehicleMake.deleteMany({
    where: { OR: [{ id: MAKE_ID }, { name: 'Other Garage Make' }] },
  });
}
