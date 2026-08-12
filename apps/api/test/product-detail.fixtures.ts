import { PrismaService } from '../src/prisma/prisma.service';

export const PDP = {
  makeId: '7a000000-0000-4000-8000-000000000001',
  generationId: '7a000000-0000-4000-8000-000000000003',
  engineId: '7a000000-0000-4000-8000-000000000004',
  otherEngineId: '7a000000-0000-4000-8000-000000000005',
  brandId: '7a000000-0000-4000-8000-000000000010',
  categoryId: '7a000000-0000-4000-8000-000000000011',
  supplierId: '7a000000-0000-4000-8000-000000000012',
  productId: '7a000000-0000-4000-8000-000000000020',
  unavailableProductId: '7a000000-0000-4000-8000-000000000021',
  exactVariantId: '7a000000-0000-4000-8000-000000000030',
  generationVariantId: '7a000000-0000-4000-8000-000000000031',
  engineOnlyVariantId: '7a000000-0000-4000-8000-000000000032',
  unknownVariantId: '7a000000-0000-4000-8000-000000000033',
  hiddenVariantId: '7a000000-0000-4000-8000-000000000034',
  ownerId: '7a000000-0000-4000-8000-000000000040',
  otherUserId: '7a000000-0000-4000-8000-000000000041',
  ownerEmail: 'pdp-owner@example.test',
  otherEmail: 'pdp-other@example.test',
} as const;

export async function createProductDetailFixtures(
  prisma: PrismaService,
  createUsers = false,
): Promise<void> {
  if (createUsers) {
    await prisma.user.createMany({
      data: [
        { id: PDP.ownerId, name: 'PDP Owner', email: PDP.ownerEmail },
        { id: PDP.otherUserId, name: 'PDP Other', email: PDP.otherEmail },
      ],
    });
  }
  await prisma.vehicleMake.create({
    data: {
      id: PDP.makeId,
      name: 'PDP Test Make',
      models: {
        create: {
          name: 'PDP Test Model',
          generations: {
            create: {
              id: PDP.generationId,
              code: 'PDP-GEN',
              yearFrom: 2019,
              yearTo: 2021,
              engineTypes: {
                create: [
                  {
                    id: PDP.engineId,
                    code: 'PDP-ENGINE',
                    name: 'PDP Engine',
                  },
                  {
                    id: PDP.otherEngineId,
                    code: 'PDP-OTHER-ENGINE',
                    name: 'PDP Other Engine',
                  },
                ],
              },
            },
          },
        },
      },
    },
  });
  await prisma.brand.create({
    data: { id: PDP.brandId, name: 'PDP Test Brand' },
  });
  await prisma.category.create({
    data: { id: PDP.categoryId, name: 'PDP Test Category' },
  });
  await prisma.supplier.create({
    data: {
      id: PDP.supplierId,
      name: 'PDP Public Supplier',
      slug: 'pdp-public-supplier',
    },
  });
  await prisma.product.create({
    data: {
      id: PDP.productId,
      name: 'Fitment-aware PDP Product',
      description: 'PDP regression fixture',
      brandId: PDP.brandId,
      categoryId: PDP.categoryId,
      variants: {
        create: [
          {
            id: PDP.exactVariantId,
            sku: 'PDP-EXACT',
            manufacturerPartNumber: 'PDP-MPN-EXACT',
            oemNumber: 'PDP-OEM-EXACT',
            fitmentRules: {
              create: [
                {
                  vehicleGenerationId: PDP.generationId,
                  effect: 'COMPATIBLE',
                },
                {
                  vehicleGenerationId: PDP.generationId,
                  engineTypeId: PDP.engineId,
                  effect: 'INCOMPATIBLE',
                },
              ],
            },
            listings: {
              create: [
                {
                  supplierId: PDP.supplierId,
                  status: 'ACTIVE',
                  condition: 'NEW',
                  price: 110,
                  currency: 'UAH',
                  stockQuantity: 3,
                },
                {
                  supplierId: PDP.supplierId,
                  status: 'DRAFT',
                  condition: 'USED',
                  price: 1,
                  currency: 'UAH',
                  stockQuantity: 99,
                },
              ],
            },
          },
          {
            id: PDP.generationVariantId,
            sku: 'PDP-GENERATION',
            manufacturerPartNumber: 'PDP-MPN-GENERATION',
            fitmentRules: {
              create: {
                vehicleGenerationId: PDP.generationId,
                effect: 'COMPATIBLE',
              },
            },
            listings: {
              create: {
                supplierId: PDP.supplierId,
                status: 'ACTIVE',
                condition: 'REMANUFACTURED',
                price: 120,
                currency: 'UAH',
                stockQuantity: 0,
              },
            },
          },
          {
            id: PDP.engineOnlyVariantId,
            sku: 'PDP-ENGINE-ONLY',
            manufacturerPartNumber: 'PDP-MPN-ENGINE-ONLY',
            fitmentRules: {
              create: {
                vehicleGenerationId: PDP.generationId,
                engineTypeId: PDP.otherEngineId,
                effect: 'COMPATIBLE',
              },
            },
            listings: {
              create: {
                supplierId: PDP.supplierId,
                status: 'ACTIVE',
                condition: 'NEW',
                price: 130,
                currency: 'UAH',
                stockQuantity: 1,
              },
            },
          },
          {
            id: PDP.unknownVariantId,
            sku: 'PDP-UNKNOWN',
            manufacturerPartNumber: 'PDP-MPN-UNKNOWN',
            listings: {
              create: {
                supplierId: PDP.supplierId,
                status: 'ACTIVE',
                condition: 'USED',
                price: 140,
                currency: 'UAH',
                stockQuantity: 2,
              },
            },
          },
          {
            id: PDP.hiddenVariantId,
            sku: 'PDP-HIDDEN',
            manufacturerPartNumber: 'PDP-MPN-HIDDEN',
            listings: {
              create: {
                supplierId: PDP.supplierId,
                status: 'PAUSED',
                condition: 'NEW',
                price: 10,
                currency: 'UAH',
                stockQuantity: 5,
              },
            },
          },
        ],
      },
    },
  });
  await prisma.product.create({
    data: {
      id: PDP.unavailableProductId,
      name: 'Unavailable PDP Product',
      brandId: PDP.brandId,
      variants: {
        create: {
          sku: 'PDP-UNAVAILABLE',
          manufacturerPartNumber: 'PDP-MPN-UNAVAILABLE',
          listings: {
            create: {
              supplierId: PDP.supplierId,
              status: 'PAUSED',
              condition: 'NEW',
              price: 20,
              currency: 'UAH',
              stockQuantity: 1,
            },
          },
        },
      },
    },
  });
}

export async function cleanProductDetailFixtures(
  prisma: PrismaService,
): Promise<void> {
  const emails = [PDP.ownerEmail, PDP.otherEmail];
  await prisma.session.deleteMany({
    where: { user: { email: { in: emails } } },
  });
  await prisma.account.deleteMany({
    where: { user: { email: { in: emails } } },
  });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.listing.deleteMany({ where: { supplierId: PDP.supplierId } });
  await prisma.product.deleteMany({
    where: { id: { in: [PDP.productId, PDP.unavailableProductId] } },
  });
  await prisma.supplier.deleteMany({ where: { id: PDP.supplierId } });
  await prisma.category.deleteMany({ where: { id: PDP.categoryId } });
  await prisma.brand.deleteMany({ where: { id: PDP.brandId } });
  await prisma.vehicleMake.deleteMany({ where: { id: PDP.makeId } });
}
