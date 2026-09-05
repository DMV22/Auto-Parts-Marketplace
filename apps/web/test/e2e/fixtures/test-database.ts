import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { parseGuardedTestDatabaseUrl } from "./test-database-url.js";

const requireFromApi = createRequire(
  fileURLToPath(new URL("../../../../api/package.json", import.meta.url)),
);

type QueryResult<Row extends Record<string, unknown>> = {
  rows: Row[];
};

type TestDatabaseClient = {
  connect: () => Promise<void>;
  end: () => Promise<void>;
  query: <Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ) => Promise<QueryResult<Row>>;
};

const PgClient = (
  requireFromApi("pg") as {
    Client: new (options: { connectionString: string }) => TestDatabaseClient;
  }
).Client;

export type TestUserRole =
  | "CUSTOMER"
  | "SUPPLIER_USER"
  | "SUPPORT_MANAGER"
  | "ADMIN";

export type SupplierMembershipStatus = "ACTIVE" | "DISABLED";

export type MarketplaceScenario = {
  activeListingId: string;
  brandName: string;
  categoryName: string;
  deliveredOrderId: string;
  deliveredOrderItemId: string;
  draftListingId: string;
  engineTypeId: string;
  generationId: string;
  makeName: string;
  modelName: string;
  paidOrderId: string;
  paidOrderItemId: string;
  pendingListingId: string;
  pendingOrderId: string;
  productId: string;
  productName: string;
  vehicleYear: number;
};

export async function provisionRole(
  email: string,
  role: TestUserRole,
  supplier?: {
    id: string;
    membershipStatus: SupplierMembershipStatus;
    name: string;
    slug: string;
  },
): Promise<{ userId: string }> {
  return withTestDatabase(async (client) => {
    const user = await client.query<{ id: string }>(
      'UPDATE "User" SET "role" = $2::"UserRole", "updatedAt" = NOW() WHERE "email" = $1 RETURNING "id"',
      [email, role],
    );
    const userId = user.rows[0]?.id;

    if (!userId) {
      throw new Error(`Better Auth test user was not created for ${email}`);
    }

    if (supplier) {
      await client.query(
        'INSERT INTO "Supplier" ("id", "name", "slug", "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW())',
        [supplier.id, supplier.name, supplier.slug],
      );
      await client.query(
        'INSERT INTO "SupplierUser" ("id", "userId", "supplierId", "status", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3::"SupplierUserStatus", NOW(), NOW())',
        [userId, supplier.id, supplier.membershipStatus],
      );
    }

    return { userId };
  });
}

export async function createForeignSupplier(input: {
  id: string;
  name: string;
  slug: string;
}): Promise<void> {
  await withTestDatabase(async (client) => {
    await client.query(
      'INSERT INTO "Supplier" ("id", "name", "slug", "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW())',
      [input.id, input.name, input.slug],
    );
  });
}

export async function cleanRoleFixture(input: {
  email: string;
  supplierIds?: string[];
}): Promise<void> {
  await withTestDatabase(async (client) => {
    const user = await client.query<{ id: string }>(
      'SELECT "id" FROM "User" WHERE "email" = $1',
      [input.email],
    );
    const userId = user.rows[0]?.id;

    if (userId) {
      await client.query('DELETE FROM "SupplierUser" WHERE "userId" = $1', [
        userId,
      ]);
      await client.query('DELETE FROM "Session" WHERE "userId" = $1', [
        userId,
      ]);
      await client.query('DELETE FROM "Account" WHERE "userId" = $1', [
        userId,
      ]);
      await client.query('DELETE FROM "Verification" WHERE "identifier" = $1', [
        input.email,
      ]);
      await client.query('DELETE FROM "User" WHERE "id" = $1', [userId]);
    }

    if (input.supplierIds?.length) {
      await client.query('DELETE FROM "Supplier" WHERE "id" = ANY($1::uuid[])', [
        input.supplierIds,
      ]);
    }
  });
}

export async function provisionMarketplaceScenario(input: {
  customerUserId: string;
  supplierId: string;
}): Promise<MarketplaceScenario> {
  const fixtureId = randomUUID();
  const ids = {
    activeListingId: randomUUID(),
    brandId: randomUUID(),
    categoryId: randomUUID(),
    deliveredOrderId: randomUUID(),
    deliveredOrderItemId: randomUUID(),
    draftListingId: randomUUID(),
    engineTypeId: randomUUID(),
    generationId: randomUUID(),
    makeId: randomUUID(),
    modelId: randomUUID(),
    paidOrderId: randomUUID(),
    paidOrderItemId: randomUUID(),
    pendingListingId: randomUUID(),
    pendingOrderId: randomUUID(),
    productId: randomUUID(),
    productVariantId: randomUUID(),
    savedVehicleId: randomUUID(),
  };
  const names = {
    brandName: `F8 Brand ${fixtureId.slice(0, 8)}`,
    categoryName: `F8 Category ${fixtureId.slice(0, 8)}`,
    engineName: `F8 2.0 ${fixtureId.slice(0, 8)}`,
    makeName: `F8 Make ${fixtureId.slice(0, 8)}`,
    modelName: `F8 Model ${fixtureId.slice(0, 8)}`,
    productName: `F8 Brake Kit ${fixtureId.slice(0, 8)}`,
    sku: `F8-SKU-${fixtureId}`,
  };

  await withTestDatabase(async (client) => {
    await client.query("BEGIN");
    try {
      await client.query(
        'INSERT INTO "Category" ("id", "name", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW())',
        [ids.categoryId, names.categoryName],
      );
      await client.query(
        'INSERT INTO "Brand" ("id", "name", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW())',
        [ids.brandId, names.brandName],
      );
      await client.query(
        'INSERT INTO "Product" ("id", "name", "description", "categoryId", "brandId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
        [
          ids.productId,
          names.productName,
          "Deterministic F8 catalog fixture",
          ids.categoryId,
          ids.brandId,
        ],
      );
      await client.query(
        'INSERT INTO "ProductVariant" ("id", "productId", "sku", "manufacturerPartNumber", "oemNumber", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
        [
          ids.productVariantId,
          ids.productId,
          names.sku,
          `MPN-${fixtureId}`,
          `OEM-${fixtureId}`,
        ],
      );
      await client.query(
        'INSERT INTO "VehicleMake" ("id", "name", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW())',
        [ids.makeId, names.makeName],
      );
      await client.query(
        'INSERT INTO "VehicleModel" ("id", "vehicleMakeId", "name", "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW())',
        [ids.modelId, ids.makeId, names.modelName],
      );
      await client.query(
        'INSERT INTO "VehicleGeneration" ("id", "vehicleModelId", "code", "name", "yearFrom", "yearTo", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, 2020, 2021, NOW(), NOW())',
        [ids.generationId, ids.modelId, `GEN-${fixtureId}`, "F8 Generation"],
      );
      await client.query(
        'INSERT INTO "EngineType" ("id", "vehicleGenerationId", "code", "name", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())',
        [ids.engineTypeId, ids.generationId, `ENG-${fixtureId}`, names.engineName],
      );
      await client.query(
        'INSERT INTO "FitmentRule" ("id", "productVariantId", "vehicleGenerationId", "engineTypeId", "effect", "createdAt") VALUES (gen_random_uuid(), $1, $2, $3, \'COMPATIBLE\'::"FitmentRuleEffect", NOW())',
        [ids.productVariantId, ids.generationId, ids.engineTypeId],
      );
      for (const [listingId, status, stockQuantity] of [
        [ids.activeListingId, "ACTIVE", 5],
        [ids.draftListingId, "DRAFT", 3],
        [ids.pendingListingId, "PENDING_APPROVAL", 2],
      ] as const) {
        await client.query(
          'INSERT INTO "Listing" ("id", "supplierId", "productVariantId", "status", "condition", "price", "currency", "stockQuantity", "inventoryVersion", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4::"ListingStatus", \'NEW\'::"ListingCondition", 459.00, \'UAH\', $5, 0, NOW(), NOW())',
          [listingId, input.supplierId, ids.productVariantId, status, stockQuantity],
        );
      }
      await client.query(
        'INSERT INTO "SavedVehicle" ("id", "userId", "vehicleGenerationId", "engineTypeId", "year", "label", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, 2020, $5, NOW(), NOW())',
        [
          ids.savedVehicleId,
          input.customerUserId,
          ids.generationId,
          ids.engineTypeId,
          "F8 primary vehicle",
        ],
      );
      await client.query(
        'UPDATE "User" SET "activeSavedVehicleId" = $2, "updatedAt" = NOW() WHERE "id" = $1',
        [input.customerUserId, ids.savedVehicleId],
      );
      for (const order of [
        {
          id: ids.deliveredOrderId,
          itemId: ids.deliveredOrderItemId,
          status: "DELIVERED",
        },
        { id: ids.paidOrderId, itemId: ids.paidOrderItemId, status: "PAID" },
        { id: ids.pendingOrderId, itemId: null, status: "PENDING_PAYMENT" },
      ] as const) {
        await client.query(
          'INSERT INTO "Order" ("id", "customerId", "status", "currency", "totalAmount", "createdAt", "updatedAt") VALUES ($1, $2, $3::"OrderStatus", \'UAH\', 459.00, NOW(), NOW())',
          [order.id, input.customerUserId, order.status],
        );
        await client.query(
          'INSERT INTO "OrderStatusEvent" ("id", "orderId", "fromStatus", "toStatus", "source", "createdAt") VALUES (gen_random_uuid(), $1, NULL, $2::"OrderStatus", \'SYSTEM\'::"OrderStatusEventSource", NOW())',
          [order.id, order.status],
        );
        if (order.itemId) {
          await client.query(
            'INSERT INTO "OrderItem" ("id", "orderId", "listingId", "quantity", "unitPrice", "productName", "sku", "manufacturerPartNumber", "condition", "supplierName", "createdAt") SELECT $1, $2, $3, 1, 459.00, $4, $5, $6, \'NEW\'::"ListingCondition", "name", NOW() FROM "Supplier" WHERE "id" = $7',
            [
              order.itemId,
              order.id,
              ids.activeListingId,
              names.productName,
              names.sku,
              `MPN-${fixtureId}`,
              input.supplierId,
            ],
          );
        }
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });

  return {
    activeListingId: ids.activeListingId,
    brandName: names.brandName,
    categoryName: names.categoryName,
    deliveredOrderId: ids.deliveredOrderId,
    deliveredOrderItemId: ids.deliveredOrderItemId,
    draftListingId: ids.draftListingId,
    engineTypeId: ids.engineTypeId,
    generationId: ids.generationId,
    makeName: names.makeName,
    modelName: names.modelName,
    paidOrderId: ids.paidOrderId,
    paidOrderItemId: ids.paidOrderItemId,
    pendingListingId: ids.pendingListingId,
    pendingOrderId: ids.pendingOrderId,
    productId: ids.productId,
    productName: names.productName,
    vehicleYear: 2021,
  };
}

export async function createScenarioReturnRequest(input: {
  customerUserId: string;
  orderItemId: string;
}): Promise<string> {
  const returnRequestId = randomUUID();
  await withTestDatabase(async (client) => {
    await client.query(
      'INSERT INTO "ReturnRequest" ("id", "orderItemId", "createdByUserId", "status", "reason", "createdAt", "updatedAt") VALUES ($1, $2, $3, \'REQUESTED\'::"ReturnRequestStatus", $4, NOW(), NOW())',
      [returnRequestId, input.orderItemId, input.customerUserId, "F8 internal return"],
    );
  });
  return returnRequestId;
}

export async function simulateConcurrentStockUpdate(
  listingId: string,
  quantity: number,
): Promise<void> {
  await withTestDatabase(async (client) => {
    await client.query(
      'UPDATE "Listing" SET "stockQuantity" = $2, "inventoryVersion" = "inventoryVersion" + 1, "updatedAt" = NOW() WHERE "id" = $1',
      [listingId, quantity],
    );
  });
}

export async function cleanMarketplaceScenario(
  scenario: MarketplaceScenario,
  customerUserId: string,
): Promise<void> {
  const orderIds = [
    scenario.deliveredOrderId,
    scenario.paidOrderId,
    scenario.pendingOrderId,
  ];
  const listingIds = [
    scenario.activeListingId,
    scenario.draftListingId,
    scenario.pendingListingId,
  ];
  await withTestDatabase(async (client) => {
    await client.query("BEGIN");
    try {
      await client.query(
        'DELETE FROM "ActivityLog" WHERE "resourceId" IN (SELECT "id" FROM "Note" WHERE "orderId" = ANY($1::uuid[]) OR "returnRequestId" IN (SELECT "id" FROM "ReturnRequest" WHERE "orderItemId" = ANY($2::uuid[])))',
        [orderIds, [scenario.deliveredOrderItemId, scenario.paidOrderItemId]],
      );
      await client.query(
        'DELETE FROM "ActivityLog" WHERE "resourceId" = ANY($1::uuid[])',
        [[...orderIds, ...listingIds]],
      );
      await client.query(
        'DELETE FROM "Note" WHERE "orderId" = ANY($1::uuid[]) OR "returnRequestId" IN (SELECT "id" FROM "ReturnRequest" WHERE "orderItemId" = ANY($2::uuid[]))',
        [orderIds, [scenario.deliveredOrderItemId, scenario.paidOrderItemId]],
      );
      await client.query(
        'DELETE FROM "ActivityLog" WHERE "resourceId" IN (SELECT "id" FROM "ReturnRequest" WHERE "orderItemId" = ANY($1::uuid[]))',
        [[scenario.deliveredOrderItemId, scenario.paidOrderItemId]],
      );
      await client.query(
        'DELETE FROM "ReturnRequest" WHERE "orderItemId" = ANY($1::uuid[])',
        [[scenario.deliveredOrderItemId, scenario.paidOrderItemId]],
      );
      await client.query(
        'DELETE FROM "PaymentEvent" WHERE "orderId" = ANY($1::uuid[])',
        [orderIds],
      );
      await client.query(
        'DELETE FROM "OrderStatusEvent" WHERE "orderId" = ANY($1::uuid[])',
        [orderIds],
      );
      await client.query(
        'DELETE FROM "OrderItem" WHERE "orderId" = ANY($1::uuid[])',
        [orderIds],
      );
      await client.query('DELETE FROM "Order" WHERE "id" = ANY($1::uuid[])', [
        orderIds,
      ]);
      const scenarioCarts = await client.query<{ cartId: string }>(
        'SELECT DISTINCT "cartId" FROM "CartItem" WHERE "listingId" = ANY($1::uuid[])',
        [listingIds],
      );
      const scenarioCartIds = scenarioCarts.rows.map((row) => row.cartId);
      await client.query(
        'DELETE FROM "CartItem" WHERE "listingId" = ANY($1::uuid[])',
        [listingIds],
      );
      if (scenarioCartIds.length) {
        await client.query('DELETE FROM "Cart" WHERE "id" = ANY($1::uuid[])', [
          scenarioCartIds,
        ]);
      }
      await client.query('DELETE FROM "Cart" WHERE "customerId" = $1', [
        customerUserId,
      ]);
      await client.query(
        'UPDATE "User" SET "activeSavedVehicleId" = NULL, "updatedAt" = NOW() WHERE "id" = $1',
        [customerUserId],
      );
      await client.query('DELETE FROM "SavedVehicle" WHERE "userId" = $1', [
        customerUserId,
      ]);
      await client.query('DELETE FROM "Listing" WHERE "id" = ANY($1::uuid[])', [
        listingIds,
      ]);
      await client.query('DELETE FROM "Product" WHERE "id" = $1', [
        scenario.productId,
      ]);
      await client.query(
        'DELETE FROM "VehicleGeneration" WHERE "id" = $1',
        [scenario.generationId],
      );
      await client.query('DELETE FROM "VehicleModel" WHERE "name" = $1', [
        scenario.modelName,
      ]);
      await client.query('DELETE FROM "VehicleMake" WHERE "name" = $1', [
        scenario.makeName,
      ]);
      await client.query('DELETE FROM "Category" WHERE "name" = $1', [
        scenario.categoryName,
      ]);
      await client.query('DELETE FROM "Brand" WHERE "name" = $1', [
        scenario.brandName,
      ]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

async function withTestDatabase<Result>(
  callback: (client: TestDatabaseClient) => Promise<Result>,
): Promise<Result> {
  // The guarded Playwright runner injects this backend-only test variable.
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  const connectionString = process.env.TEST_DATABASE_URL;

  const guardedDatabaseUrl = parseGuardedTestDatabaseUrl(connectionString);

  const client = new PgClient({ connectionString: guardedDatabaseUrl.toString() });
  await client.connect();

  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}
