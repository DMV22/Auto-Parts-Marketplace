const LOCAL_TEST_DATABASE_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
]);
const TEST_DATABASE_NAME = "auto_parts_test";

/**
 * @param {string | undefined} value
 * @returns {URL}
 */
export function parseGuardedTestDatabaseUrl(value) {
  if (!value) {
    throw new Error("TEST_DATABASE_URL is required for frontend E2E");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL URL");
  }

  const databaseName = decodeURIComponent(parsedUrl.pathname).replace(/^\//, "");
  const isPostgreSql = ["postgres:", "postgresql:"].includes(
    parsedUrl.protocol,
  );
  const isLocalHost = LOCAL_TEST_DATABASE_HOSTS.has(parsedUrl.hostname);

  if (!isPostgreSql || !isLocalHost || databaseName !== TEST_DATABASE_NAME) {
    throw new Error(
      "Frontend E2E requires a local TEST_DATABASE_URL targeting auto_parts_test",
    );
  }

  return parsedUrl;
}
