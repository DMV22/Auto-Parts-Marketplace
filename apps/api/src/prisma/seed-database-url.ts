const LOCAL_SEED_DATABASE_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const SEED_DATABASE_NAME = 'auto_parts_dev';

export function getSeedDatabaseUrl(value = process.env.DATABASE_URL): string {
  if (!value) {
    throw new Error('DATABASE_URL is required for demo seed');
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL');
  }

  const databaseName = decodeURIComponent(
    parsedUrl.pathname.replace(/^\//, ''),
  );
  const isPostgreSql = ['postgres:', 'postgresql:'].includes(
    parsedUrl.protocol,
  );
  const isLocalHost = LOCAL_SEED_DATABASE_HOSTS.has(parsedUrl.hostname);

  if (!isPostgreSql || !isLocalHost || databaseName !== SEED_DATABASE_NAME) {
    throw new Error(
      'Demo seed requires a local DATABASE_URL targeting auto_parts_dev',
    );
  }

  return value;
}
