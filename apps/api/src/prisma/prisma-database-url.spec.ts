import { getPrismaDatabaseUrl } from './prisma-database-url';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL;
const ORIGINAL_TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

function restoreEnvironmentVariable(
  name: 'NODE_ENV' | 'DATABASE_URL' | 'TEST_DATABASE_URL',
  value: string | undefined,
): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

describe('getPrismaDatabaseUrl', () => {
  afterEach(() => {
    restoreEnvironmentVariable('NODE_ENV', ORIGINAL_NODE_ENV);
    restoreEnvironmentVariable('DATABASE_URL', ORIGINAL_DATABASE_URL);
    restoreEnvironmentVariable('TEST_DATABASE_URL', ORIGINAL_TEST_DATABASE_URL);
  });

  it('uses only the guarded local auto_parts_test URL in tests', () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL =
      'postgresql://local:local@localhost:5433/auto_parts_dev';
    process.env.TEST_DATABASE_URL =
      'postgresql://local:local@localhost:5433/auto_parts_test';

    expect(getPrismaDatabaseUrl()).toBe(process.env.TEST_DATABASE_URL);
  });

  it.each([
    'postgresql://local:local@localhost:5433/auto_parts_dev',
    'postgresql://local:local@database.example.com:5432/auto_parts_test',
    'mysql://local:local@localhost:3306/auto_parts_test',
  ])('rejects an unsafe test database target: %s', (databaseUrl) => {
    process.env.NODE_ENV = 'test';
    process.env.TEST_DATABASE_URL = databaseUrl;

    expect(() => getPrismaDatabaseUrl()).toThrow(
      'Tests require a local TEST_DATABASE_URL targeting auto_parts_test',
    );
  });

  it('rejects a missing TEST_DATABASE_URL', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.TEST_DATABASE_URL;

    expect(() => getPrismaDatabaseUrl()).toThrow(
      'TEST_DATABASE_URL is required',
    );
  });

  it('rejects a malformed TEST_DATABASE_URL', () => {
    process.env.NODE_ENV = 'test';
    process.env.TEST_DATABASE_URL = 'not-a-url';

    expect(() => getPrismaDatabaseUrl()).toThrow(
      'TEST_DATABASE_URL must be a valid PostgreSQL URL',
    );
  });

  it('uses DATABASE_URL outside the test environment', () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL =
      'postgresql://local:local@localhost:5433/auto_parts_dev';

    expect(getPrismaDatabaseUrl()).toBe(process.env.DATABASE_URL);
  });
});
