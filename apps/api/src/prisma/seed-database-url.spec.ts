import { getSeedDatabaseUrl } from './seed-database-url';

describe('getSeedDatabaseUrl', () => {
  it.each([
    'postgresql://local:local@localhost:5432/auto_parts_dev',
    'postgres://local:local@127.0.0.1:5432/auto_parts_dev',
    'postgresql://local:local@[::1]:5432/auto_parts_dev',
  ])('accepts the guarded local development database: %s', (databaseUrl) => {
    expect(getSeedDatabaseUrl(databaseUrl)).toBe(databaseUrl);
  });

  it.each([
    'postgresql://local:local@localhost:5432/auto_parts_test',
    'postgresql://local:local@localhost:5432/postgres',
    'postgresql://local:local@database.example.com:5432/auto_parts_dev',
    'mysql://local:local@localhost:3306/auto_parts_dev',
  ])('rejects an unsafe seed target: %s', (databaseUrl) => {
    expect(() => getSeedDatabaseUrl(databaseUrl)).toThrow(
      'Demo seed requires a local DATABASE_URL targeting auto_parts_dev',
    );
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() => getSeedDatabaseUrl('')).toThrow(
      'DATABASE_URL is required for demo seed',
    );
  });

  it('rejects a malformed DATABASE_URL', () => {
    expect(() => getSeedDatabaseUrl('not-a-url')).toThrow(
      'DATABASE_URL must be a valid PostgreSQL URL',
    );
  });
});
