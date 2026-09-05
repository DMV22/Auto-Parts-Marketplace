const NEON_HOST_SUFFIX = '.neon.tech';
const POSTGRES_PROTOCOLS = new Set(['postgres:', 'postgresql:']);

export type PublicDemoDatabaseTargetInput = {
  databaseUrl: string | undefined;
  expectedDatabaseName: string | undefined;
  testDatabaseUrl: string | undefined;
};

export type PublicDemoDatabaseTarget = {
  host: string;
  databaseName: string;
  connectionType: 'direct';
  sslMode: 'require';
};

export function inspectPublicDemoDatabaseTarget(
  input: PublicDemoDatabaseTargetInput,
): PublicDemoDatabaseTarget {
  const databaseUrl = requiredValue(input.databaseUrl, 'DATABASE_URL');
  const expectedDatabaseName = requiredValue(
    input.expectedDatabaseName,
    'PUBLIC_DEMO_DATABASE_NAME',
  );

  if (input.testDatabaseUrl?.trim()) {
    throw new Error(
      'TEST_DATABASE_URL must not be configured for public-demo operations',
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL');
  }

  if (!POSTGRES_PROTOCOLS.has(parsedUrl.protocol)) {
    throw new Error('DATABASE_URL must use the PostgreSQL protocol');
  }

  const host = parsedUrl.hostname.toLowerCase();

  if (!host.endsWith(NEON_HOST_SUFFIX)) {
    throw new Error('DATABASE_URL must target an approved Neon host');
  }

  if (host.split('.')[0]?.endsWith('-pooler')) {
    throw new Error('Public-demo migrations require a direct Neon connection');
  }

  if (!parsedUrl.username || !parsedUrl.password) {
    throw new Error('DATABASE_URL must include migration credentials');
  }

  const databaseName = readDatabaseName(parsedUrl);

  if (databaseName !== expectedDatabaseName) {
    throw new Error(
      'DATABASE_URL database does not match PUBLIC_DEMO_DATABASE_NAME',
    );
  }

  if (parsedUrl.searchParams.get('sslmode') !== 'require') {
    throw new Error('DATABASE_URL must include sslmode=require');
  }

  return {
    host,
    databaseName,
    connectionType: 'direct',
    sslMode: 'require',
  };
}

export function formatPublicDemoDatabaseTarget(
  target: PublicDemoDatabaseTarget,
): string {
  return [
    'Approved public-demo migration target',
    `host=${target.host}`,
    `database=${target.databaseName}`,
    `connection=${target.connectionType}`,
    `ssl=${target.sslMode}`,
  ].join(' ');
}

function requiredValue(value: string | undefined, name: string): string {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${name} is required for public-demo preflight`);
  }

  return normalized;
}

function readDatabaseName(parsedUrl: URL): string {
  const encodedName = parsedUrl.pathname.replace(/^\//, '');

  try {
    const databaseName = decodeURIComponent(encodedName);

    if (!databaseName || databaseName.includes('/')) {
      throw new Error('invalid');
    }

    return databaseName;
  } catch {
    throw new Error('DATABASE_URL must contain one valid database name');
  }
}
