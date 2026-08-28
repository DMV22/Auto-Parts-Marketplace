import { createRequire } from "node:module";
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
