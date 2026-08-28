import { defineConfig, devices } from "@playwright/test";

// The optional local browser channel is test-only and not a build cache input.
// eslint-disable-next-line turbo/no-undeclared-env-vars
const browserChannel = process.env.PLAYWRIGHT_CHANNEL;
const inheritedEnvironment = Object.fromEntries(
  Object.entries(process.env).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  ),
);
const webEnvironment = Object.fromEntries(
  Object.entries(inheritedEnvironment).filter(
    ([name]) =>
      ![
        "BETTER_AUTH_SECRET",
        "DATABASE_URL",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "TEST_DATABASE_URL",
      ].includes(name),
  ),
);

export default defineConfig({
  testDir: "./test/e2e",
  testMatch: "*.e2e-spec.ts",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "pnpm --filter api start",
      env: { ...inheritedEnvironment, PORT: "3001" },
      reuseExistingServer: false,
      timeout: 120_000,
      url: "http://localhost:3001/api/auth/get-session",
    },
    {
      command: "pnpm --filter web start",
      env: { ...webEnvironment, PORT: "3000" },
      reuseExistingServer: false,
      timeout: 120_000,
      url: "http://localhost:3000",
    },
  ],
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(browserChannel ? { channel: browserChannel } : {}),
      },
    },
  ],
});
