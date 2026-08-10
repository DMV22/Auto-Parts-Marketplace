const LOCAL_TEST_DATABASE_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const TEST_DATABASE_NAME = 'auto_parts_test';

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function getTestDatabaseUrl(): string {
  const value = requireEnvironmentVariable('TEST_DATABASE_URL');
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error('TEST_DATABASE_URL must be a valid PostgreSQL URL');
  }

  const databaseName = decodeURIComponent(
    parsedUrl.pathname.replace(/^\//, ''),
  );
  const isPostgreSql = ['postgres:', 'postgresql:'].includes(
    parsedUrl.protocol,
  );
  const isLocalHost = LOCAL_TEST_DATABASE_HOSTS.has(parsedUrl.hostname);

  if (!isPostgreSql || !isLocalHost || databaseName !== TEST_DATABASE_NAME) {
    throw new Error(
      'Tests require a local TEST_DATABASE_URL targeting auto_parts_test',
    );
  }

  return value;
}

export function getPrismaDatabaseUrl(): string {
  if (process.env.NODE_ENV === 'test') {
    return getTestDatabaseUrl();
  }

  return requireEnvironmentVariable('DATABASE_URL');
}
