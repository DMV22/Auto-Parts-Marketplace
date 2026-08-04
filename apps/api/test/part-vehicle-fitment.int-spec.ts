import 'dotenv/config';
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
});
