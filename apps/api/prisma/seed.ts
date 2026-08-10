/* eslint-disable @typescript-eslint/no-unsafe-argument */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { getSeedDatabaseUrl } from '../src/prisma/seed-database-url';
import {
  demoBrands,
  demoCategories,
  demoEngineTypes,
  demoFitmentRules,
  demoListings,
  demoOrderItems,
  demoOrders,
  demoPaymentEvents,
  demoProducts,
  demoProductVariants,
  demoReturnRequests,
  demoSuppliers,
  demoSupplierUsers,
  demoUsers,
  demoVehicleGenerations,
  demoVehicleMakes,
  demoVehicleModels,
} from './seed-data';

function requireId(ids: Map<string, string>, key: string): string {
  const id = ids.get(key);

  if (!id) {
    throw new Error(`Missing seeded dependency: ${key}`);
  }

  return id;
}

async function seed(): Promise<void> {
  const databaseUrl = getSeedDatabaseUrl();
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  try {
    await prisma.$transaction(async (transaction) => {
      const userIds = new Map<string, string>();
      const supplierIds = new Map<string, string>();
      const categoryIds = new Map<string, string>();
      const brandIds = new Map<string, string>();
      const variantIds = new Map<string, string>();
      const makeIds = new Map<string, string>();
      const modelIds = new Map<string, string>();
      const generationIds = new Map<string, string>();
      const engineIds = new Map<string, string>();

      for (const user of demoUsers) {
        const seededUser = await transaction.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name,
            role: user.role,
            isActive: true,
          },
          create: {
            ...user,
            emailVerified: false,
            isActive: true,
          },
        });

        userIds.set(user.email, seededUser.id);
      }

      for (const supplier of demoSuppliers) {
        const seededSupplier = await transaction.supplier.upsert({
          where: { slug: supplier.slug },
          update: { name: supplier.name },
          create: supplier,
        });

        supplierIds.set(supplier.slug, seededSupplier.id);
      }

      for (const membership of demoSupplierUsers) {
        const userId = requireId(userIds, membership.userEmail);

        await transaction.supplierUser.upsert({
          where: { userId },
          update: {
            supplierId: requireId(supplierIds, membership.supplierSlug),
            status: 'ACTIVE',
          },
          create: {
            id: membership.id,
            userId,
            supplierId: requireId(supplierIds, membership.supplierSlug),
            status: 'ACTIVE',
          },
        });
      }

      for (const category of demoCategories) {
        const seededCategory = await transaction.category.upsert({
          where: { name: category.name },
          update: {},
          create: category,
        });

        categoryIds.set(category.name, seededCategory.id);
      }

      for (const brand of demoBrands) {
        const seededBrand = await transaction.brand.upsert({
          where: { name: brand.name },
          update: {},
          create: brand,
        });

        brandIds.set(brand.name, seededBrand.id);
      }

      for (const product of demoProducts) {
        await transaction.product.upsert({
          where: { id: product.id },
          update: {
            name: product.name,
            description: product.description,
            categoryId: requireId(categoryIds, product.categoryName),
            brandId: requireId(brandIds, product.brandName),
          },
          create: {
            id: product.id,
            name: product.name,
            description: product.description,
            categoryId: requireId(categoryIds, product.categoryName),
            brandId: requireId(brandIds, product.brandName),
          },
        });
      }

      for (const variant of demoProductVariants) {
        const seededVariant = await transaction.productVariant.upsert({
          where: { sku: variant.sku },
          update: {
            productId: variant.productId,
            manufacturerPartNumber: variant.manufacturerPartNumber,
            oemNumber: variant.oemNumber,
          },
          create: variant,
        });

        variantIds.set(variant.sku, seededVariant.id);
      }

      for (const make of demoVehicleMakes) {
        const seededMake = await transaction.vehicleMake.upsert({
          where: { name: make.name },
          update: {},
          create: make,
        });

        makeIds.set(make.name, seededMake.id);
      }

      for (const model of demoVehicleModels) {
        const vehicleMakeId = requireId(makeIds, model.makeName);
        const seededModel = await transaction.vehicleModel.upsert({
          where: {
            vehicleMakeId_name: { vehicleMakeId, name: model.name },
          },
          update: {},
          create: {
            id: model.id,
            vehicleMakeId,
            name: model.name,
          },
        });

        modelIds.set(`${model.makeName}:${model.name}`, seededModel.id);
      }

      for (const generation of demoVehicleGenerations) {
        const vehicleModelId = requireId(modelIds, generation.modelKey);
        const seededGeneration = await transaction.vehicleGeneration.upsert({
          where: {
            vehicleModelId_code: {
              vehicleModelId,
              code: generation.code,
            },
          },
          update: {
            name: generation.name,
            yearFrom: generation.yearFrom,
            yearTo: generation.yearTo,
          },
          create: {
            id: generation.id,
            vehicleModelId,
            code: generation.code,
            name: generation.name,
            yearFrom: generation.yearFrom,
            yearTo: generation.yearTo,
          },
        });

        generationIds.set(
          `${generation.modelKey}:${generation.code}`,
          seededGeneration.id,
        );
      }

      for (const engine of demoEngineTypes) {
        const vehicleGenerationId = requireId(
          generationIds,
          engine.generationKey,
        );
        const seededEngine = await transaction.engineType.upsert({
          where: {
            vehicleGenerationId_code: {
              vehicleGenerationId,
              code: engine.code,
            },
          },
          update: { name: engine.name },
          create: {
            id: engine.id,
            vehicleGenerationId,
            code: engine.code,
            name: engine.name,
          },
        });

        engineIds.set(
          `${engine.generationKey}:${engine.code}`,
          seededEngine.id,
        );
      }

      for (const fitment of demoFitmentRules) {
        await transaction.fitmentRule.upsert({
          where: { id: fitment.id },
          update: {
            productVariantId: requireId(variantIds, fitment.variantSku),
            vehicleGenerationId: requireId(
              generationIds,
              fitment.generationKey,
            ),
            engineTypeId: requireId(engineIds, fitment.engineKey),
          },
          create: {
            id: fitment.id,
            productVariantId: requireId(variantIds, fitment.variantSku),
            vehicleGenerationId: requireId(
              generationIds,
              fitment.generationKey,
            ),
            engineTypeId: requireId(engineIds, fitment.engineKey),
          },
        });
      }

      for (const listing of demoListings) {
        await transaction.listing.upsert({
          where: { id: listing.id },
          update: {
            supplierId: requireId(supplierIds, listing.supplierSlug),
            productVariantId: requireId(variantIds, listing.variantSku),
            status: listing.status,
            price: listing.price,
            currency: 'UAH',
            stockQuantity: listing.stockQuantity,
          },
          create: {
            id: listing.id,
            supplierId: requireId(supplierIds, listing.supplierSlug),
            productVariantId: requireId(variantIds, listing.variantSku),
            status: listing.status,
            price: listing.price,
            currency: 'UAH',
            stockQuantity: listing.stockQuantity,
          },
        });
      }

      for (const order of demoOrders) {
        await transaction.order.upsert({
          where: { id: order.id },
          update: {
            customerId: requireId(userIds, order.customerEmail),
            status: order.status,
            currency: 'UAH',
            totalAmount: order.totalAmount,
          },
          create: {
            id: order.id,
            customerId: requireId(userIds, order.customerEmail),
            status: order.status,
            currency: 'UAH',
            totalAmount: order.totalAmount,
          },
        });
      }

      for (const item of demoOrderItems) {
        await transaction.orderItem.upsert({
          where: { id: item.id },
          update: {
            orderId: item.orderId,
            listingId: item.listingId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          },
          create: item,
        });
      }

      for (const event of demoPaymentEvents) {
        await transaction.paymentEvent.upsert({
          where: { externalEventId: event.externalEventId },
          update: {},
          create: {
            id: event.id,
            orderId: event.orderId,
            externalEventId: event.externalEventId,
            provider: 'demo',
            eventType: event.eventType,
            status: event.status,
            payload: { synthetic: true, scenario: event.scenario },
            processedAt: new Date(event.processedAt),
          },
        });
      }

      for (const request of demoReturnRequests) {
        await transaction.returnRequest.upsert({
          where: { id: request.id },
          update: {
            orderItemId: request.orderItemId,
            status: request.status,
            reason: request.reason,
          },
          create: request,
        });
      }
    });

    const demoUserFilter = { endsWith: '@auto-parts.local' } as const;
    const [
      users,
      supplierUsers,
      suppliers,
      categories,
      brands,
      products,
      variants,
      fitmentRules,
      listings,
      orders,
      paymentEvents,
      returnRequests,
      accounts,
      sessions,
      verifications,
    ] = await Promise.all([
      prisma.user.count({ where: { email: demoUserFilter } }),
      prisma.supplierUser.count({
        where: { user: { email: demoUserFilter } },
      }),
      prisma.supplier.count({ where: { slug: { startsWith: 'demo-' } } }),
      prisma.category.count({
        where: { name: { in: demoCategories.map(({ name }) => name) } },
      }),
      prisma.brand.count({
        where: { name: { in: demoBrands.map(({ name }) => name) } },
      }),
      prisma.product.count({
        where: { id: { in: demoProducts.map(({ id }) => id) } },
      }),
      prisma.productVariant.count({
        where: { sku: { startsWith: 'DEMO-' } },
      }),
      prisma.fitmentRule.count({
        where: { id: { in: demoFitmentRules.map(({ id }) => id) } },
      }),
      prisma.listing.count({
        where: { id: { in: demoListings.map(({ id }) => id) } },
      }),
      prisma.order.count({
        where: { id: { in: demoOrders.map(({ id }) => id) } },
      }),
      prisma.paymentEvent.count({
        where: {
          externalEventId: {
            in: demoPaymentEvents.map(({ externalEventId }) => externalEventId),
          },
        },
      }),
      prisma.returnRequest.count({
        where: { id: { in: demoReturnRequests.map(({ id }) => id) } },
      }),
      prisma.account.count({
        where: { user: { email: demoUserFilter } },
      }),
      prisma.session.count({
        where: { user: { email: demoUserFilter } },
      }),
      prisma.verification.count({
        where: { identifier: demoUserFilter },
      }),
    ]);

    console.info('Demo seed summary', {
      users,
      supplierUsers,
      suppliers,
      categories,
      brands,
      products,
      variants,
      fitmentRules,
      listings,
      orders,
      paymentEvents,
      returnRequests,
      accounts,
      sessions,
      verifications,
    });
  } finally {
    await prisma.$disconnect();
  }
}

void seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
