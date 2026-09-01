import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseGuardedTestDatabaseUrl } from "./fixtures/test-database-url.js";

const webDirectory = fileURLToPath(new URL("../..", import.meta.url));
const repositoryDirectory = fileURLToPath(new URL("../../../..", import.meta.url));
const apiEnvironmentFile = fileURLToPath(
  new URL("../../../api/.env", import.meta.url),
);

if (existsSync(apiEnvironmentFile)) {
  process.loadEnvFile(apiEnvironmentFile);
}

// This guarded test runner intentionally reads a backend-only variable without
// making it part of the Turborepo production cache contract.
// eslint-disable-next-line turbo/no-undeclared-env-vars
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL is required in the environment or apps/api/.env",
  );
}

parseGuardedTestDatabaseUrl(testDatabaseUrl);

const browserChannel =
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  process.env.PLAYWRIGHT_CHANNEL ??
  (process.platform === "win32" &&
  existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
    ? "chrome"
    : process.platform === "win32" &&
        existsSync(
          "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        )
      ? "msedge"
      : undefined);

const testEnvironment = {
  ...process.env,
  API_INTERNAL_URL: "http://localhost:3001",
  BETTER_AUTH_SECRET:
    "test-only-better-auth-secret-at-least-32-characters",
  BETTER_AUTH_URL: "http://localhost:3000",
  DATABASE_URL: testDatabaseUrl,
  GOOGLE_CLIENT_ID: "test-google-client-id",
  GOOGLE_CLIENT_SECRET: "test-google-client-secret",
  NODE_ENV: "test",
  PORT: "3001",
  ...(browserChannel ? { PLAYWRIGHT_CHANNEL: browserChannel } : {}),
  STRIPE_CHECKOUT_CANCEL_URL: "http://localhost:3000/cart",
  STRIPE_CHECKOUT_SUCCESS_URL:
    "http://localhost:3000/checkout/success?session_id={CHECKOUT_SESSION_ID}",
  STRIPE_SECRET_KEY: "sk_test_synthetic_checkout_key",
  STRIPE_WEBHOOK_SECRET: "whsec_test_synthetic_webhook_secret",
  TEST_DATABASE_URL: testDatabaseUrl,
};

// npm_execpath is supplied by pnpm while this package script is running.
// eslint-disable-next-line turbo/no-undeclared-env-vars
const pnpmCli = process.env.npm_execpath;
const playwrightArguments = process.argv.slice(2);
if (playwrightArguments[0] === "--") playwrightArguments.shift();
const reuseBuildIndex = playwrightArguments.indexOf("--reuse-build");
const reuseBuild = reuseBuildIndex >= 0;
if (reuseBuild) playwrightArguments.splice(reuseBuildIndex, 1);

if (!pnpmCli) {
  throw new Error("pnpm CLI path is unavailable in npm_execpath");
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    env: testEnvironment,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!reuseBuild) {
  run(process.execPath, [pnpmCli, "--filter", "api", "prisma:migrate:deploy"], repositoryDirectory);
  run(process.execPath, [pnpmCli, "--filter", "api", "build"], repositoryDirectory);
  run(process.execPath, [pnpmCli, "--filter", "web", "build"], repositoryDirectory);
}
run(
  process.execPath,
  [
    pnpmCli,
    "exec",
    "playwright",
    "test",
    "--config",
    "playwright.config.ts",
    ...playwrightArguments,
  ],
  webDirectory,
);
