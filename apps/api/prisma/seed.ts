import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { getSeedDatabaseUrl } from '../src/prisma/seed-database-url';
import {
  demoActivityLogs,
  demoBrands,
  demoCartItems,
  demoCarts,
  demoCategories,
  demoCustomerProfiles,
  demoEngineTypes,
  demoFitmentRules,
  demoListings,
  demoNotes,
  demoOrderItems,
  demoOrders,
  demoOrderStatusEvents,
  demoPaymentEvents,
  demoProducts,
  demoProductVariants,
  demoReturnRequests,
  demoSavedVehicles,
  demoSuppliers,
  demoSupplierUsers,
  demoUsers,
  demoVehicleGenerations,
  demoVehicleMakes,
  demoVehicleModels,
} from './seed-data';
import { DEMO_SEED_VERSION, demoSeedCounts } from './seed-manifest';

const DEFAULT_CREATED_AT = new Date('2026-01-05T09:00:00.000Z');
const DEFAULT_UPDATED_AT = new Date('2026-01-05T09:01:00.000Z');

function requireId(ids: Map<string, string>, key: string): string {
  const id = ids.get(key);

  if (!id) {
    throw new Error(`Missing seeded dependency: ${key}`);
  }

  return id;
}

function optionalId(
  ids: Map<string, string>,
  key: string | null | undefined,
): string | null {
  return key ? requireId(ids, key) : null;
}

async function seed(): Promise<void> {
  const databaseUrl = getSeedDatabaseUrl();
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  try {
    await prisma.$transaction(
      async (transaction) => {
        const userIds = new Map<string, string>();
        const supplierIds = new Map<string, string>();
        const categoryIds = new Map<string, string>();
        const brandIds = new Map<string, string>();
        const variantIds = new Map<string, string>();
        const makeIds = new Map<string, string>();
        const modelIds = new Map<string, string>();
        const generationIds = new Map<string, string>();
        const engineIds = new Map<string, string>();
        const listingIds = new Map<string, string>();
        const cartIds = new Map<string, string>();
        const paymentEventIds = new Map<string, string>();

        for (const user of demoUsers) {
          const seededUser = await transaction.user.upsert({
            where: { email: user.email },
            update: {
              name: user.name,
              role: user.role,
              isActive: true,
              updatedAt: DEFAULT_UPDATED_AT,
            },
            create: {
              id: user.id,
              name: user.name,
              email: user.email,
              emailVerified: false,
              role: user.role,
              isActive: true,
              createdAt: DEFAULT_CREATED_AT,
              updatedAt: DEFAULT_UPDATED_AT,
            },
          });

          userIds.set(user.email, seededUser.id);
        }

        for (const profile of demoCustomerProfiles) {
          const userId = requireId(userIds, profile.userEmail);
          await transaction.customerProfile.upsert({
            where: { userId },
            update: {
              phone: profile.phone,
              updatedAt: DEFAULT_UPDATED_AT,
            },
            create: {
              id: profile.id,
              userId,
              phone: profile.phone,
              createdAt: DEFAULT_CREATED_AT,
              updatedAt: DEFAULT_UPDATED_AT,
            },
          });
        }

        for (const supplier of demoSuppliers) {
          const seededSupplier = await transaction.supplier.upsert({
            where: { slug: supplier.slug },
            update: {
              name: supplier.name,
              updatedAt: DEFAULT_UPDATED_AT,
            },
            create: {
              id: supplier.id,
              name: supplier.name,
              slug: supplier.slug,
              createdAt: DEFAULT_CREATED_AT,
              updatedAt: DEFAULT_UPDATED_AT,
            },
          });

          supplierIds.set(supplier.slug, seededSupplier.id);
        }

        for (const membership of demoSupplierUsers) {
          const userId = requireId(userIds, membership.userEmail);
          await transaction.supplierUser.upsert({
            where: { userId },
            update: {
              supplierId: requireId(supplierIds, membership.supplierSlug),
              status: membership.status,
              updatedAt: DEFAULT_UPDATED_AT,
            },
            create: {
              id: membership.id,
              userId,
              supplierId: requireId(supplierIds, membership.supplierSlug),
              status: membership.status,
              createdAt: DEFAULT_CREATED_AT,
              updatedAt: DEFAULT_UPDATED_AT,
            },
          });
        }

        for (const category of demoCategories) {
          const seededCategory = await transaction.category.upsert({
            where: { name: category.name },
            update: { updatedAt: DEFAULT_UPDATED_AT },
            create: {
              ...category,
              createdAt: DEFAULT_CREATED_AT,
              updatedAt: DEFAULT_UPDATED_AT,
            },
          });

          categoryIds.set(category.name, seededCategory.id);
        }

        for (const brand of demoBrands) {
          const seededBrand = await transaction.brand.upsert({
            where: { name: brand.name },
            update: { updatedAt: DEFAULT_UPDATED_AT },
            create: {
              ...brand,
              createdAt: DEFAULT_CREATED_AT,
              updatedAt: DEFAULT_UPDATED_AT,
            },
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
              updatedAt: DEFAULT_UPDATED_AT,
            },
            create: {
              id: product.id,
              name: product.name,
              description: product.description,
              categoryId: requireId(categoryIds, product.categoryName),
              brandId: requireId(brandIds, product.brandName),
              createdAt: DEFAULT_CREATED_AT,
              updatedAt: DEFAULT_UPDATED_AT,
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
              updatedAt: DEFAULT_UPDATED_AT,
            },
            create: {
              id: variant.id,
              productId: variant.productId,
              sku: variant.sku,
              manufacturerPartNumber: variant.manufacturerPartNumber,
              oemNumber: variant.oemNumber,
              createdAt: DEFAULT_CREATED_AT,
              updatedAt: DEFAULT_UPDATED_AT,
            },
          });

          variantIds.set(variant.sku, seededVariant.id);
        }

        for (const make of demoVehicleMakes) {
          const seededMake = await transaction.vehicleMake.upsert({
            where: { name: make.name },
            update: { updatedAt: DEFAULT_UPDATED_AT },
            create: {
              ...make,
              createdAt: DEFAULT_CREATED_AT,
              updatedAt: DEFAULT_UPDATED_AT,
            },
          });

          makeIds.set(make.name, seededMake.id);
        }

        for (const model of demoVehicleModels) {
          const vehicleMakeId = requireId(makeIds, model.makeName);
          const seededModel = await transaction.vehicleModel.upsert({
            where: {
              vehicleMakeId_name: { vehicleMakeId, name: model.name },
            },
            update: { updatedAt: DEFAULT_UPDATED_AT },
            create: {
              id: model.id,
              vehicleMakeId,
              name: model.name,
              createdAt: DEFAULT_CREATED_AT,
              updatedAt: DEFAULT_UPDATED_AT,
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
              updatedAt: DEFAULT_UPDATED_AT,
            },
            create: {
              id: generation.id,
              vehicleModelId,
              code: generation.code,
              name: generation.name,
              yearFrom: generation.yearFrom,
              yearTo: generation.yearTo,
              createdAt: DEFAULT_CREATED_AT,
              updatedAt: DEFAULT_UPDATED_AT,
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
            update: {
              name: engine.name,
              updatedAt: DEFAULT_UPDATED_AT,
            },
            create: {
              id: engine.id,
              vehicleGenerationId,
              code: engine.code,
              name: engine.name,
              createdAt: DEFAULT_CREATED_AT,
              updatedAt: DEFAULT_UPDATED_AT,
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
              engineTypeId: optionalId(engineIds, fitment.engineKey),
              effect: fitment.effect,
            },
            create: {
              id: fitment.id,
              productVariantId: requireId(variantIds, fitment.variantSku),
              vehicleGenerationId: requireId(
                generationIds,
                fitment.generationKey,
              ),
              engineTypeId: optionalId(engineIds, fitment.engineKey),
              effect: fitment.effect,
              createdAt: DEFAULT_CREATED_AT,
            },
          });
        }

        for (const savedVehicle of demoSavedVehicles) {
          await transaction.savedVehicle.upsert({
            where: { id: savedVehicle.id },
            update: {
              userId: requireId(userIds, savedVehicle.userEmail),
              vehicleGenerationId: requireId(
                generationIds,
                savedVehicle.generationKey,
              ),
              engineTypeId: requireId(engineIds, savedVehicle.engineKey),
              year: savedVehicle.year,
              label: savedVehicle.label,
              updatedAt: new Date(savedVehicle.createdAt),
            },
            create: {
              id: savedVehicle.id,
              userId: requireId(userIds, savedVehicle.userEmail),
              vehicleGenerationId: requireId(
                generationIds,
                savedVehicle.generationKey,
              ),
              engineTypeId: requireId(engineIds, savedVehicle.engineKey),
              year: savedVehicle.year,
              label: savedVehicle.label,
              createdAt: new Date(savedVehicle.createdAt),
              updatedAt: new Date(savedVehicle.createdAt),
            },
          });
        }

        for (const savedVehicle of demoSavedVehicles.filter(
          (vehicle) => vehicle.isActive,
        )) {
          await transaction.user.update({
            where: { email: savedVehicle.userEmail },
            data: {
              activeSavedVehicleId: savedVehicle.id,
              updatedAt: DEFAULT_UPDATED_AT,
            },
          });
        }

        for (const listing of demoListings) {
          const seededListing = await transaction.listing.upsert({
            where: { id: listing.id },
            update: {
              supplierId: requireId(supplierIds, listing.supplierSlug),
              productVariantId: requireId(variantIds, listing.variantSku),
              status: listing.status,
              condition: listing.condition,
              price: listing.price,
              currency: listing.currency,
              stockQuantity: listing.stockQuantity,
              inventoryVersion: listing.inventoryVersion,
              rejectionReason: listing.rejectionReason,
              moderationReason: listing.moderationReason,
              updatedAt: new Date(listing.updatedAt),
            },
            create: {
              id: listing.id,
              supplierId: requireId(supplierIds, listing.supplierSlug),
              productVariantId: requireId(variantIds, listing.variantSku),
              status: listing.status,
              condition: listing.condition,
              price: listing.price,
              currency: listing.currency,
              stockQuantity: listing.stockQuantity,
              inventoryVersion: listing.inventoryVersion,
              rejectionReason: listing.rejectionReason,
              moderationReason: listing.moderationReason,
              createdAt: new Date(listing.createdAt),
              updatedAt: new Date(listing.updatedAt),
            },
          });

          listingIds.set(listing.fixtureKey, seededListing.id);
        }

        for (const cart of demoCarts) {
          const customerId = requireId(userIds, cart.customerEmail);
          const seededCart = await transaction.cart.upsert({
            where: { customerId },
            update: {
              guestTokenHash: null,
              currency: cart.currency,
              expiresAt: null,
              updatedAt: new Date(cart.createdAt),
            },
            create: {
              id: cart.id,
              customerId,
              guestTokenHash: null,
              currency: cart.currency,
              expiresAt: null,
              createdAt: new Date(cart.createdAt),
              updatedAt: new Date(cart.createdAt),
            },
          });

          cartIds.set(cart.fixtureKey, seededCart.id);
        }

        for (const item of demoCartItems) {
          await transaction.cartItem.upsert({
            where: { id: item.id },
            update: {
              cartId: requireId(cartIds, item.cartKey),
              listingId: requireId(listingIds, item.listingKey),
              quantity: item.quantity,
              updatedAt: new Date(item.createdAt),
            },
            create: {
              id: item.id,
              cartId: requireId(cartIds, item.cartKey),
              listingId: requireId(listingIds, item.listingKey),
              quantity: item.quantity,
              createdAt: new Date(item.createdAt),
              updatedAt: new Date(item.createdAt),
            },
          });
        }

        for (const order of demoOrders) {
          await transaction.order.upsert({
            where: { id: order.id },
            update: {
              customerId: optionalId(userIds, order.customerEmail),
              guestTokenHash: order.guestTokenHash,
              status: order.status,
              currency: order.currency,
              totalAmount: order.totalAmount,
              checkoutRequestId: order.checkoutRequestId,
              checkoutRequestFingerprint: order.checkoutRequestFingerprint,
              checkoutExpiresAt: new Date(order.checkoutExpiresAt),
              checkoutSessionId: null,
              checkoutSessionUrl: null,
              reservationReleasedAt: order.reservationReleasedAt
                ? new Date(order.reservationReleasedAt)
                : null,
              createdAt: new Date(order.createdAt),
              updatedAt: new Date(order.updatedAt),
            },
            create: {
              id: order.id,
              customerId: optionalId(userIds, order.customerEmail),
              guestTokenHash: order.guestTokenHash,
              status: order.status,
              currency: order.currency,
              totalAmount: order.totalAmount,
              checkoutRequestId: order.checkoutRequestId,
              checkoutRequestFingerprint: order.checkoutRequestFingerprint,
              checkoutExpiresAt: new Date(order.checkoutExpiresAt),
              reservationReleasedAt: order.reservationReleasedAt
                ? new Date(order.reservationReleasedAt)
                : null,
              createdAt: new Date(order.createdAt),
              updatedAt: new Date(order.updatedAt),
            },
          });
        }

        for (const item of demoOrderItems) {
          await transaction.orderItem.upsert({
            where: { id: item.id },
            update: {
              orderId: item.orderId,
              listingId: requireId(listingIds, item.listingKey),
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              productName: item.productName,
              sku: item.sku,
              manufacturerPartNumber: item.manufacturerPartNumber,
              condition: item.condition,
              supplierName: item.supplierName,
            },
            create: {
              id: item.id,
              orderId: item.orderId,
              listingId: requireId(listingIds, item.listingKey),
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              productName: item.productName,
              sku: item.sku,
              manufacturerPartNumber: item.manufacturerPartNumber,
              condition: item.condition,
              supplierName: item.supplierName,
              createdAt: new Date(item.createdAt),
            },
          });
        }

        for (const event of demoPaymentEvents) {
          const seededPaymentEvent = await transaction.paymentEvent.upsert({
            where: { externalEventId: event.externalEventId },
            update: {
              orderId: event.orderId,
              provider: 'demo',
              eventType: event.eventType,
              status: event.status,
              payload: {
                synthetic: true,
                seedVersion: DEMO_SEED_VERSION,
                scenario: event.scenario,
              },
              receivedAt: new Date(event.receivedAt),
              processedAt: new Date(event.processedAt),
            },
            create: {
              id: event.id,
              orderId: event.orderId,
              externalEventId: event.externalEventId,
              provider: 'demo',
              eventType: event.eventType,
              status: event.status,
              payload: {
                synthetic: true,
                seedVersion: DEMO_SEED_VERSION,
                scenario: event.scenario,
              },
              receivedAt: new Date(event.receivedAt),
              processedAt: new Date(event.processedAt),
            },
          });

          paymentEventIds.set(event.id, seededPaymentEvent.id);
        }

        for (const event of demoOrderStatusEvents) {
          await transaction.orderStatusEvent.upsert({
            where: { id: event.id },
            update: {
              orderId: event.orderId,
              fromStatus: event.fromStatus,
              toStatus: event.toStatus,
              source: event.source,
              paymentEventId: optionalId(paymentEventIds, event.paymentEventId),
              createdAt: new Date(event.createdAt),
            },
            create: {
              id: event.id,
              orderId: event.orderId,
              fromStatus: event.fromStatus,
              toStatus: event.toStatus,
              source: event.source,
              paymentEventId: optionalId(paymentEventIds, event.paymentEventId),
              createdAt: new Date(event.createdAt),
            },
          });
        }

        for (const request of demoReturnRequests) {
          await transaction.returnRequest.upsert({
            where: { id: request.id },
            update: {
              orderItemId: request.orderItemId,
              createdByUserId: optionalId(userIds, request.createdByUserEmail),
              decidedByUserId: optionalId(userIds, request.decidedByUserEmail),
              status: request.status,
              reason: request.reason,
              decisionReason: request.decisionReason,
              decidedAt: request.decidedAt ? new Date(request.decidedAt) : null,
              updatedAt: new Date(request.updatedAt),
            },
            create: {
              id: request.id,
              orderItemId: request.orderItemId,
              createdByUserId: optionalId(userIds, request.createdByUserEmail),
              decidedByUserId: optionalId(userIds, request.decidedByUserEmail),
              status: request.status,
              reason: request.reason,
              decisionReason: request.decisionReason,
              decidedAt: request.decidedAt ? new Date(request.decidedAt) : null,
              createdAt: new Date(request.createdAt),
              updatedAt: new Date(request.updatedAt),
            },
          });
        }

        for (const note of demoNotes) {
          await transaction.note.upsert({
            where: { id: note.id },
            update: {
              orderId: note.orderId,
              returnRequestId: note.returnRequestId,
              authorUserId: requireId(userIds, note.authorUserEmail),
              correctsNoteId: note.correctsNoteId,
              body: note.body,
              redactedAt: note.redactedAt ? new Date(note.redactedAt) : null,
              redactedByUserId: optionalId(userIds, note.redactedByUserEmail),
              redactionReason: note.redactionReason,
              createdAt: new Date(note.createdAt),
            },
            create: {
              id: note.id,
              orderId: note.orderId,
              returnRequestId: note.returnRequestId,
              authorUserId: requireId(userIds, note.authorUserEmail),
              correctsNoteId: note.correctsNoteId,
              body: note.body,
              redactedAt: note.redactedAt ? new Date(note.redactedAt) : null,
              redactedByUserId: optionalId(userIds, note.redactedByUserEmail),
              redactionReason: note.redactionReason,
              createdAt: new Date(note.createdAt),
            },
          });
        }

        for (const activity of demoActivityLogs) {
          await transaction.activityLog.upsert({
            where: { id: activity.id },
            update: {
              actorUserId: optionalId(userIds, activity.actorUserEmail),
              actorRole: activity.actorRole,
              resourceType: activity.resourceType,
              resourceId: activity.resourceId,
              action: activity.action,
              previousStatus: activity.previousStatus,
              newStatus: activity.newStatus,
              reason: activity.reason,
              metadata: activity.metadata ?? undefined,
              createdAt: new Date(activity.createdAt),
            },
            create: {
              id: activity.id,
              actorUserId: optionalId(userIds, activity.actorUserEmail),
              actorRole: activity.actorRole,
              resourceType: activity.resourceType,
              resourceId: activity.resourceId,
              action: activity.action,
              previousStatus: activity.previousStatus,
              newStatus: activity.newStatus,
              reason: activity.reason,
              metadata: activity.metadata ?? undefined,
              createdAt: new Date(activity.createdAt),
            },
          });
        }
      },
      { maxWait: 10_000, timeout: 120_000 },
    );

    const summary = {
      users: await prisma.user.count({
        where: { id: { in: demoUsers.map(({ id }) => id) } },
      }),
      customerProfiles: await prisma.customerProfile.count({
        where: { id: { in: demoCustomerProfiles.map(({ id }) => id) } },
      }),
      suppliers: await prisma.supplier.count({
        where: { id: { in: demoSuppliers.map(({ id }) => id) } },
      }),
      supplierUsers: await prisma.supplierUser.count({
        where: { id: { in: demoSupplierUsers.map(({ id }) => id) } },
      }),
      categories: await prisma.category.count({
        where: { id: { in: demoCategories.map(({ id }) => id) } },
      }),
      brands: await prisma.brand.count({
        where: { id: { in: demoBrands.map(({ id }) => id) } },
      }),
      products: await prisma.product.count({
        where: { id: { in: demoProducts.map(({ id }) => id) } },
      }),
      productVariants: await prisma.productVariant.count({
        where: { id: { in: demoProductVariants.map(({ id }) => id) } },
      }),
      vehicleMakes: await prisma.vehicleMake.count({
        where: { id: { in: demoVehicleMakes.map(({ id }) => id) } },
      }),
      vehicleModels: await prisma.vehicleModel.count({
        where: { id: { in: demoVehicleModels.map(({ id }) => id) } },
      }),
      vehicleGenerations: await prisma.vehicleGeneration.count({
        where: {
          id: { in: demoVehicleGenerations.map(({ id }) => id) },
        },
      }),
      engineTypes: await prisma.engineType.count({
        where: { id: { in: demoEngineTypes.map(({ id }) => id) } },
      }),
      fitmentRules: await prisma.fitmentRule.count({
        where: { id: { in: demoFitmentRules.map(({ id }) => id) } },
      }),
      savedVehicles: await prisma.savedVehicle.count({
        where: { id: { in: demoSavedVehicles.map(({ id }) => id) } },
      }),
      listings: await prisma.listing.count({
        where: { id: { in: demoListings.map(({ id }) => id) } },
      }),
      carts: await prisma.cart.count({
        where: { id: { in: demoCarts.map(({ id }) => id) } },
      }),
      cartItems: await prisma.cartItem.count({
        where: { id: { in: demoCartItems.map(({ id }) => id) } },
      }),
      orders: await prisma.order.count({
        where: { id: { in: demoOrders.map(({ id }) => id) } },
      }),
      orderItems: await prisma.orderItem.count({
        where: { id: { in: demoOrderItems.map(({ id }) => id) } },
      }),
      paymentEvents: await prisma.paymentEvent.count({
        where: {
          externalEventId: {
            in: demoPaymentEvents.map(({ externalEventId }) => externalEventId),
          },
        },
      }),
      orderStatusEvents: await prisma.orderStatusEvent.count({
        where: { id: { in: demoOrderStatusEvents.map(({ id }) => id) } },
      }),
      returnRequests: await prisma.returnRequest.count({
        where: { id: { in: demoReturnRequests.map(({ id }) => id) } },
      }),
      notes: await prisma.note.count({
        where: { id: { in: demoNotes.map(({ id }) => id) } },
      }),
      activityLogs: await prisma.activityLog.count({
        where: { id: { in: demoActivityLogs.map(({ id }) => id) } },
      }),
    };

    for (const [name, expected] of Object.entries(demoSeedCounts)) {
      const actual = summary[name as keyof typeof summary];
      if (actual !== expected) {
        throw new Error(
          `Demo seed verification failed for ${name}: expected ${expected}, received ${actual}`,
        );
      }
    }

    const [accounts, sessions, verifications] = await Promise.all([
      prisma.account.count({
        where: { user: { email: { endsWith: '@auto-parts.local' } } },
      }),
      prisma.session.count({
        where: { user: { email: { endsWith: '@auto-parts.local' } } },
      }),
      prisma.verification.count({
        where: { identifier: { endsWith: '@auto-parts.local' } },
      }),
    ]);

    console.info('Demo seed summary', {
      seedVersion: DEMO_SEED_VERSION,
      ...summary,
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
