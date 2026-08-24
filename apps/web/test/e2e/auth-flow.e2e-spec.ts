import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const CUSTOMER_EMAIL = "frontend-f1-customer@example.test";
const CUSTOMER_NAME = "Frontend F1 Customer";
const CUSTOMER_PASSWORD = "password123";
const requireFromApi = createRequire(
  fileURLToPath(new URL("../../../api/package.json", import.meta.url)),
);

type TestDatabaseClient = {
  connect: () => Promise<void>;
  end: () => Promise<void>;
  query: (text: string, values?: unknown[]) => Promise<unknown>;
};

const PgClient = (
  requireFromApi("pg") as {
    Client: new (options: { connectionString: string }) => TestDatabaseClient;
  }
).Client;

async function cleanAuthFixture() {
  // This test-only database URL is injected by the guarded F0 E2E runner.
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  const connectionString = process.env.TEST_DATABASE_URL;

  if (!connectionString) {
    throw new Error("TEST_DATABASE_URL is required for auth fixture cleanup");
  }

  const databaseUrl = new URL(connectionString);

  if (databaseUrl.pathname.replace(/^\//, "") !== "auto_parts_test") {
    throw new Error("Refusing to clean auth fixture outside auto_parts_test");
  }

  const client = new PgClient({ connectionString });
  await client.connect();

  try {
    await client.query('DELETE FROM "User" WHERE "email" = $1', [
      CUSTOMER_EMAIL,
    ]);
  } finally {
    await client.end();
  }
}

test.beforeEach(cleanAuthFixture);
test.afterEach(cleanAuthFixture);

test("restores an email session after refresh and supports sign-out/sign-in", async ({
  page,
}) => {
  await page.goto("/sign-up");
  await page.getByLabel("Ім’я").fill(CUSTOMER_NAME);
  await page.getByLabel("Email").fill(CUSTOMER_EMAIL);
  await page.getByLabel("Пароль").fill(CUSTOMER_PASSWORD);
  await page.getByRole("button", { name: "Створити акаунт" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByText(CUSTOMER_NAME)).toBeVisible();

  await page.reload();
  await expect(page.getByText(CUSTOMER_NAME)).toBeVisible();

  await page.getByRole("button", { name: "Вийти" }).click();
  const headerSignInLink = page
    .getByLabel("Основна навігація")
    .getByRole("link", { name: "Увійти" });
  await expect(headerSignInLink).toBeVisible();
  await page.reload();
  await expect(headerSignInLink).toBeVisible();

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(CUSTOMER_EMAIL);
  await page.getByLabel("Пароль").fill(CUSTOMER_PASSWORD);
  await page.getByRole("button", { name: "Увійти" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByText(CUSTOMER_NAME)).toBeVisible();
});

test("initiates Google OAuth through the same-origin auth boundary", async ({
  page,
}) => {
  await page.route("https://accounts.google.com/**", (route) => route.abort());
  await page.goto("/sign-in");

  const googleRequest = page.waitForRequest(
    (request) => request.url().startsWith("https://accounts.google.com/"),
  );
  await page.getByRole("button", { name: "Продовжити з Google" }).click();

  await expect(googleRequest).resolves.toBeDefined();
});

test("keeps backend authorization authoritative for anonymous visitors", async ({
  page,
}) => {
  await page.goto("/");

  const response = await page.evaluate(async () => {
    const result = await fetch("/api/v1/garage/vehicles", {
      credentials: "include",
    });

    return { status: result.status };
  });

  expect(response.status).toBe(401);
});
