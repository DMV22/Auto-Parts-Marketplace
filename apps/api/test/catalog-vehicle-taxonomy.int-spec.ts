import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Catalog and vehicle taxonomy persistence', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;

  async function cleanDatabase(): Promise<void> {
    await prisma.fitmentRule.deleteMany();
    await prisma.engineType.deleteMany();
    await prisma.vehicleGeneration.deleteMany();
    await prisma.vehicleModel.deleteMany();
    await prisma.vehicleMake.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.brand.deleteMany();
  }

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();

    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    if (prisma) {
      await cleanDatabase();
    }

    await moduleRef?.close();
  });

  it('creates and reads a product variant with an engine-specific fitment rule', async () => {
    const category = await prisma.category.create({
      data: { name: 'Brakes' },
    });
    const brand = await prisma.brand.create({
      data: { name: 'Brembo' },
    });
    const product = await prisma.product.create({
      data: {
        name: 'Front brake pad set',
        categoryId: category.id,
        brandId: brand.id,
      },
    });
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: 'BR-P85020',
        manufacturerPartNumber: 'P85020',
        oemNumber: '5Q0698151',
      },
    });
    const make = await prisma.vehicleMake.create({
      data: { name: 'Volkswagen' },
    });
    const model = await prisma.vehicleModel.create({
      data: {
        vehicleMakeId: make.id,
        name: 'Golf',
      },
    });
    const generation = await prisma.vehicleGeneration.create({
      data: {
        vehicleModelId: model.id,
        code: 'golf-viii',
        name: 'VIII',
        yearFrom: 2019,
        yearTo: 2024,
      },
    });
    const engine = await prisma.engineType.create({
      data: {
        vehicleGenerationId: generation.id,
        code: 'ea211-1.5-tsi',
        name: '1.5 TSI',
      },
    });

    const createdFitmentRule = await prisma.fitmentRule.create({
      data: {
        productVariantId: variant.id,
        vehicleGenerationId: generation.id,
        engineTypeId: engine.id,
        effect: 'COMPATIBLE',
      },
    });
    const fitmentRule = await prisma.fitmentRule.findUniqueOrThrow({
      where: { id: createdFitmentRule.id },
      include: {
        productVariant: {
          include: {
            product: {
              include: {
                brand: true,
                category: true,
              },
            },
          },
        },
        vehicleGeneration: {
          include: {
            vehicleModel: {
              include: { vehicleMake: true },
            },
          },
        },
        engineType: true,
      },
    });

    expect(fitmentRule).toMatchObject({
      productVariant: {
        sku: 'BR-P85020',
        manufacturerPartNumber: 'P85020',
        product: {
          name: 'Front brake pad set',
          brand: { name: 'Brembo' },
          category: { name: 'Brakes' },
        },
      },
      vehicleGeneration: {
        code: 'golf-viii',
        yearFrom: 2019,
        yearTo: 2024,
        vehicleModel: {
          name: 'Golf',
          vehicleMake: { name: 'Volkswagen' },
        },
      },
      engineType: {
        code: 'ea211-1.5-tsi',
        name: '1.5 TSI',
      },
    });
  });

  it('rejects duplicate generation-level fitment rules', async () => {
    const brand = await prisma.brand.create({
      data: { name: 'MANN-FILTER' },
    });
    const product = await prisma.product.create({
      data: {
        name: 'Oil filter',
        brandId: brand.id,
      },
    });
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: 'MF-W71295',
        manufacturerPartNumber: 'W71295',
      },
    });
    const make = await prisma.vehicleMake.create({
      data: { name: 'Skoda' },
    });
    const model = await prisma.vehicleModel.create({
      data: {
        vehicleMakeId: make.id,
        name: 'Octavia',
      },
    });
    const generation = await prisma.vehicleGeneration.create({
      data: {
        vehicleModelId: model.id,
        code: 'octavia-nx',
        name: 'NX',
        yearFrom: 2019,
        yearTo: 2025,
      },
    });
    const genericRule = {
      productVariantId: variant.id,
      vehicleGenerationId: generation.id,
      effect: 'COMPATIBLE' as const,
    };

    await prisma.fitmentRule.create({ data: genericRule });

    await expect(
      prisma.fitmentRule.create({ data: genericRule }),
    ).rejects.toMatchObject({
      code: 'P2002',
    });
  });

  it('rejects an engine that belongs to another vehicle generation', async () => {
    const brand = await prisma.brand.create({
      data: { name: 'Bosch' },
    });
    const product = await prisma.product.create({
      data: {
        name: 'Cabin air filter',
        brandId: brand.id,
      },
    });
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: 'BO-1987432543',
        manufacturerPartNumber: '1987432543',
      },
    });
    const make = await prisma.vehicleMake.create({
      data: { name: 'BMW' },
    });
    const model = await prisma.vehicleModel.create({
      data: {
        vehicleMakeId: make.id,
        name: '3 Series',
      },
    });
    const g20 = await prisma.vehicleGeneration.create({
      data: {
        vehicleModelId: model.id,
        code: 'g20',
        name: 'G20',
        yearFrom: 2019,
        yearTo: 2025,
      },
    });
    const g21 = await prisma.vehicleGeneration.create({
      data: {
        vehicleModelId: model.id,
        code: 'g21',
        name: 'G21',
        yearFrom: 2019,
        yearTo: 2025,
      },
    });
    const g21Engine = await prisma.engineType.create({
      data: {
        vehicleGenerationId: g21.id,
        code: 'b48b20',
        name: 'B48B20',
      },
    });

    await expect(
      prisma.fitmentRule.create({
        data: {
          productVariantId: variant.id,
          vehicleGenerationId: g20.id,
          engineTypeId: g21Engine.id,
          effect: 'COMPATIBLE',
        },
      }),
    ).rejects.toMatchObject({
      code: 'P2003',
    });
  });

  it('cascades fitment rules without deleting the other aggregate', async () => {
    const brand = await prisma.brand.create({ data: { name: 'ATE' } });
    const product = await prisma.product.create({
      data: {
        name: 'Brake disc',
        brandId: brand.id,
      },
    });
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: 'ATE-24011002751',
        manufacturerPartNumber: '24011002751',
      },
    });
    const make = await prisma.vehicleMake.create({ data: { name: 'Audi' } });
    const model = await prisma.vehicleModel.create({
      data: {
        vehicleMakeId: make.id,
        name: 'A4',
      },
    });
    const generation = await prisma.vehicleGeneration.create({
      data: {
        vehicleModelId: model.id,
        code: 'b9',
        name: 'B9',
        yearFrom: 2015,
        yearTo: 2024,
      },
    });
    const firstRule = await prisma.fitmentRule.create({
      data: {
        productVariantId: variant.id,
        vehicleGenerationId: generation.id,
        effect: 'COMPATIBLE',
      },
    });

    await prisma.product.delete({ where: { id: product.id } });

    await expect(
      prisma.fitmentRule.findUnique({ where: { id: firstRule.id } }),
    ).resolves.toBeNull();
    await expect(
      prisma.vehicleGeneration.findUnique({ where: { id: generation.id } }),
    ).resolves.toMatchObject({ id: generation.id });

    const secondProduct = await prisma.product.create({
      data: {
        name: 'Replacement brake disc',
        brandId: brand.id,
      },
    });
    const secondVariant = await prisma.productVariant.create({
      data: {
        productId: secondProduct.id,
        sku: 'ATE-24011002752',
        manufacturerPartNumber: '24011002752',
      },
    });
    const secondRule = await prisma.fitmentRule.create({
      data: {
        productVariantId: secondVariant.id,
        vehicleGenerationId: generation.id,
        effect: 'COMPATIBLE',
      },
    });

    await prisma.vehicleMake.delete({ where: { id: make.id } });

    await expect(
      prisma.fitmentRule.findUnique({ where: { id: secondRule.id } }),
    ).resolves.toBeNull();
    await expect(
      prisma.productVariant.findUnique({ where: { id: secondVariant.id } }),
    ).resolves.toMatchObject({ id: secondVariant.id });
  });
});
