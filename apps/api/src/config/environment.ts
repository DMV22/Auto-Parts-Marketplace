const MINIMUM_AUTH_SECRET_LENGTH = 32;
const DEFAULT_PORT = 3001;
const LOCAL_DATABASE_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

const SERVER_VARIABLES = [
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_CHECKOUT_SUCCESS_URL',
  'STRIPE_CHECKOUT_CANCEL_URL',
] as const;

type EnvironmentName = 'development' | 'test' | 'production';

export type ApiEnvironment = {
  nodeEnv: EnvironmentName;
  port: number;
};

export function validateApiEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): ApiEnvironment {
  const issues: string[] = [];
  const nodeEnv = readEnvironmentName(env.NODE_ENV, issues);
  const databaseVariable =
    nodeEnv === 'test' ? 'TEST_DATABASE_URL' : 'DATABASE_URL';

  const values = new Map<string, string>();
  for (const name of [databaseVariable, ...SERVER_VARIABLES]) {
    const value = env[name]?.trim();

    if (!value) {
      issues.push(`${name} is required`);
      continue;
    }

    values.set(name, value);
  }

  const port = readPort(env.PORT, issues);
  validateDatabaseUrl(databaseVariable, values.get(databaseVariable), issues);
  validateAuthSecret(values.get('BETTER_AUTH_SECRET'), issues);

  const authUrl = validateHttpUrl(
    'BETTER_AUTH_URL',
    values.get('BETTER_AUTH_URL'),
    issues,
  );
  const successUrl = validateHttpUrl(
    'STRIPE_CHECKOUT_SUCCESS_URL',
    values.get('STRIPE_CHECKOUT_SUCCESS_URL'),
    issues,
  );
  const cancelUrl = validateHttpUrl(
    'STRIPE_CHECKOUT_CANCEL_URL',
    values.get('STRIPE_CHECKOUT_CANCEL_URL'),
    issues,
  );

  validatePrefix(
    'STRIPE_WEBHOOK_SECRET',
    values.get('STRIPE_WEBHOOK_SECRET'),
    'whsec_',
    issues,
  );

  if (nodeEnv === 'production') {
    validatePublicDemoEnvironment({
      env,
      values,
      authUrl,
      successUrl,
      cancelUrl,
      databaseVariable,
      issues,
    });
  }

  if (issues.length > 0) {
    throw new Error(
      `Invalid API environment configuration: ${issues.join('; ')}`,
    );
  }

  return { nodeEnv, port };
}

function readEnvironmentName(
  value: string | undefined,
  issues: string[],
): EnvironmentName {
  if (!value) return 'development';
  if (value === 'development' || value === 'test' || value === 'production') {
    return value;
  }

  issues.push('NODE_ENV must be development, test, or production');
  return 'development';
}

function readPort(value: string | undefined, issues: string[]): number {
  if (!value) return DEFAULT_PORT;

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    issues.push('PORT must be an integer between 1 and 65535');
    return DEFAULT_PORT;
  }

  return port;
}

function validateDatabaseUrl(
  name: string,
  value: string | undefined,
  issues: string[],
): URL | undefined {
  if (!value) return undefined;

  const url = parseUrl(name, value, issues);
  if (url && !['postgres:', 'postgresql:'].includes(url.protocol)) {
    issues.push(`${name} must use the PostgreSQL protocol`);
  }

  return url;
}

function validateHttpUrl(
  name: string,
  value: string | undefined,
  issues: string[],
): URL | undefined {
  if (!value) return undefined;

  const url = parseUrl(name, value, issues);
  if (url && !['http:', 'https:'].includes(url.protocol)) {
    issues.push(`${name} must be an absolute HTTP(S) URL`);
    return undefined;
  }

  return url;
}

function parseUrl(
  name: string,
  value: string,
  issues: string[],
): URL | undefined {
  try {
    return new URL(value);
  } catch {
    issues.push(`${name} must be a valid absolute URL`);
    return undefined;
  }
}

function validateAuthSecret(value: string | undefined, issues: string[]): void {
  if (value && value.length < MINIMUM_AUTH_SECRET_LENGTH) {
    issues.push(
      `BETTER_AUTH_SECRET must contain at least ${MINIMUM_AUTH_SECRET_LENGTH} characters`,
    );
  }
}

function validatePrefix(
  name: string,
  value: string | undefined,
  prefix: string,
  issues: string[],
): void {
  if (value && !value.startsWith(prefix)) {
    issues.push(`${name} has an invalid format`);
  }
}

function validatePublicDemoEnvironment(input: {
  env: NodeJS.ProcessEnv;
  values: Map<string, string>;
  authUrl: URL | undefined;
  successUrl: URL | undefined;
  cancelUrl: URL | undefined;
  databaseVariable: string;
  issues: string[];
}): void {
  const {
    env,
    values,
    authUrl,
    successUrl,
    cancelUrl,
    databaseVariable,
    issues,
  } = input;
  const databaseUrl = values.get(databaseVariable);
  const parsedDatabaseUrl = databaseUrl
    ? parseUrl(databaseVariable, databaseUrl, [])
    : undefined;

  if (env.TEST_DATABASE_URL?.trim()) {
    issues.push('TEST_DATABASE_URL must not be configured in production');
  }

  if (
    parsedDatabaseUrl &&
    LOCAL_DATABASE_HOSTS.has(parsedDatabaseUrl.hostname)
  ) {
    issues.push('DATABASE_URL must not target a local host in production');
  }

  if (
    parsedDatabaseUrl &&
    parsedDatabaseUrl.searchParams.get('sslmode') !== 'require'
  ) {
    issues.push('DATABASE_URL must require TLS in production');
  }

  validateHttpsUrl('BETTER_AUTH_URL', authUrl, issues);
  validateHttpsUrl('STRIPE_CHECKOUT_SUCCESS_URL', successUrl, issues);
  validateHttpsUrl('STRIPE_CHECKOUT_CANCEL_URL', cancelUrl, issues);
  validateSameOrigin(
    authUrl,
    successUrl,
    'STRIPE_CHECKOUT_SUCCESS_URL',
    issues,
  );
  validateSameOrigin(authUrl, cancelUrl, 'STRIPE_CHECKOUT_CANCEL_URL', issues);
  validatePrefix(
    'STRIPE_SECRET_KEY',
    values.get('STRIPE_SECRET_KEY'),
    'sk_test_',
    issues,
  );

  for (const [name, value] of values) {
    if (value.includes('REPLACE_WITH')) {
      issues.push(`${name} must not use a placeholder in production`);
    }
  }
}

function validateHttpsUrl(
  name: string,
  url: URL | undefined,
  issues: string[],
): void {
  if (url && url.protocol !== 'https:') {
    issues.push(`${name} must use HTTPS in production`);
  }
}

function validateSameOrigin(
  authUrl: URL | undefined,
  checkoutUrl: URL | undefined,
  checkoutName: string,
  issues: string[],
): void {
  if (authUrl && checkoutUrl && authUrl.origin !== checkoutUrl.origin) {
    issues.push(`${checkoutName} must use the BETTER_AUTH_URL origin`);
  }
}
