import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Part, Vehicle, and Fitment persistence', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();

    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.fitment.deleteMany();
    await prisma.part.deleteMany();
    await prisma.vehicle.deleteMany();
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.fitment.deleteMany();
      await prisma.part.deleteMany();
      await prisma.vehicle.deleteMany();
    }

    await moduleRef?.close();
  });

  it('creates and reads a part with its compatible vehicle', async () => {
    const part = await prisma.part.create({
      data: {
        name: 'Front brake pad set',
        manufacturer: 'Brembo',
        manufacturerPartNumber: 'P85020',
      },
    });
    const vehicle = await prisma.vehicle.create({
      data: {
        make: 'Volkswagen',
        model: 'Golf',
        year: 2020,
      },
    });

    await prisma.fitment.create({
      data: {
        partId: part.id,
        vehicleId: vehicle.id,
      },
    });

    const storedFitment = await prisma.fitment.findUnique({
      where: {
        partId_vehicleId: {
          partId: part.id,
          vehicleId: vehicle.id,
        },
      },
      include: {
        part: true,
        vehicle: true,
      },
    });

    expect(storedFitment).toMatchObject({
      part: {
        id: part.id,
        manufacturerPartNumber: 'P85020',
      },
      vehicle: {
        id: vehicle.id,
        make: 'Volkswagen',
        model: 'Golf',
        year: 2020,
      },
    });
  });

  it('rejects a duplicate part and vehicle fitment', async () => {
    const part = await prisma.part.create({
      data: {
        name: 'Oil filter',
        manufacturer: 'MANN-FILTER',
        manufacturerPartNumber: 'W71295',
      },
    });
    const vehicle = await prisma.vehicle.create({
      data: {
        make: 'Skoda',
        model: 'Octavia',
        year: 2021,
      },
    });
    const fitment = {
      partId: part.id,
      vehicleId: vehicle.id,
    };

    await prisma.fitment.create({ data: fitment });

    await expect(
      prisma.fitment.create({ data: fitment }),
    ).rejects.toMatchObject({
      code: 'P2002',
    });
  });

  it('rejects a fitment that references a missing parent', async () => {
    const part = await prisma.part.create({
      data: {
        name: 'Cabin air filter',
        manufacturer: 'Bosch',
        manufacturerPartNumber: '1987432543',
      },
    });
    const vehicle = await prisma.vehicle.create({
      data: {
        make: 'BMW',
        model: '3 Series',
        year: 2023,
      },
    });

    await expect(
      prisma.fitment.create({
        data: {
          partId: part.id,
          vehicleId: randomUUID(),
        },
      }),
    ).rejects.toMatchObject({
      code: 'P2003',
    });
    await expect(
      prisma.fitment.create({
        data: {
          partId: randomUUID(),
          vehicleId: vehicle.id,
        },
      }),
    ).rejects.toMatchObject({
      code: 'P2003',
    });
  });

  it('cascades fitment deletion without deleting the other parent', async () => {
    const part = await prisma.part.create({
      data: {
        name: 'Rear brake disc',
        manufacturer: 'ATE',
        manufacturerPartNumber: '24011002751',
      },
    });
    const vehicle = await prisma.vehicle.create({
      data: {
        make: 'Audi',
        model: 'A4',
        year: 2022,
      },
    });
    await prisma.fitment.create({
      data: {
        partId: part.id,
        vehicleId: vehicle.id,
      },
    });

    await prisma.part.delete({ where: { id: part.id } });

    await expect(
      prisma.fitment.findUnique({
        where: {
          partId_vehicleId: {
            partId: part.id,
            vehicleId: vehicle.id,
          },
        },
      }),
    ).resolves.toBeNull();
    await expect(
      prisma.vehicle.findUnique({ where: { id: vehicle.id } }),
    ).resolves.toMatchObject({ id: vehicle.id });

    const secondPart = await prisma.part.create({
      data: {
        name: 'Front brake disc',
        manufacturer: 'ATE',
        manufacturerPartNumber: '24011202751',
      },
    });
    await prisma.fitment.create({
      data: {
        partId: secondPart.id,
        vehicleId: vehicle.id,
      },
    });

    await prisma.vehicle.delete({ where: { id: vehicle.id } });

    await expect(
      prisma.fitment.findUnique({
        where: {
          partId_vehicleId: {
            partId: secondPart.id,
            vehicleId: vehicle.id,
          },
        },
      }),
    ).resolves.toBeNull();
    await expect(
      prisma.part.findUnique({ where: { id: secondPart.id } }),
    ).resolves.toMatchObject({ id: secondPart.id });
  });
});
