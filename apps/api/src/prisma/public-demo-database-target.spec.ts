import {
  formatPublicDemoDatabaseTarget,
  inspectPublicDemoDatabaseTarget,
  type PublicDemoDatabaseTargetInput,
} from './public-demo-database-target';

const VALID_INPUT: PublicDemoDatabaseTargetInput = {
  databaseUrl:
    'postgresql://operator:not-a-real-secret@ep-demo.eu-central-1.aws.neon.tech/auto_parts_demo?sslmode=require',
  expectedDatabaseName: 'auto_parts_demo',
  testDatabaseUrl: undefined,
};

describe('inspectPublicDemoDatabaseTarget', () => {
  it('returns only sanitized metadata for an approved direct Neon target', () => {
    const target = inspectPublicDemoDatabaseTarget(VALID_INPUT);

    expect(target).toEqual({
      host: 'ep-demo.eu-central-1.aws.neon.tech',
      databaseName: 'auto_parts_demo',
      connectionType: 'direct',
      sslMode: 'require',
    });
    expect(formatPublicDemoDatabaseTarget(target)).toBe(
      'Approved public-demo migration target ' +
        'host=ep-demo.eu-central-1.aws.neon.tech ' +
        'database=auto_parts_demo connection=direct ssl=require',
    );
  });

  it.each([
    ['missing URL', { databaseUrl: undefined }],
    ['missing allowlisted name', { expectedDatabaseName: undefined }],
    ['configured test URL', { testDatabaseUrl: 'configured' }],
    ['malformed URL', { databaseUrl: 'not-a-url' }],
    [
      'non-PostgreSQL protocol',
      { databaseUrl: 'mysql://operator:secret@db.neon.tech/auto_parts_demo' },
    ],
    [
      'non-Neon host',
      {
        databaseUrl:
          'postgresql://operator:secret@example.com/auto_parts_demo?sslmode=require',
      },
    ],
    [
      'pooled host',
      {
        databaseUrl:
          'postgresql://operator:secret@ep-demo-pooler.eu-central-1.aws.neon.tech/auto_parts_demo?sslmode=require',
      },
    ],
    [
      'missing credentials',
      {
        databaseUrl:
          'postgresql://ep-demo.eu-central-1.aws.neon.tech/auto_parts_demo?sslmode=require',
      },
    ],
    [
      'different database',
      {
        databaseUrl:
          'postgresql://operator:secret@ep-demo.eu-central-1.aws.neon.tech/other?sslmode=require',
      },
    ],
    [
      'missing TLS requirement',
      {
        databaseUrl:
          'postgresql://operator:secret@ep-demo.eu-central-1.aws.neon.tech/auto_parts_demo',
      },
    ],
  ])('rejects %s', (_case, override) => {
    expect(() =>
      inspectPublicDemoDatabaseTarget({ ...VALID_INPUT, ...override }),
    ).toThrow();
  });

  it('never includes credentials in a rejection message', () => {
    const sensitiveValue = 'credential-that-must-not-be-logged';

    expect(() =>
      inspectPublicDemoDatabaseTarget({
        ...VALID_INPUT,
        databaseUrl: `postgresql://operator:${sensitiveValue}@example.com/auto_parts_demo?sslmode=require`,
      }),
    ).toThrow('DATABASE_URL must target an approved Neon host');

    try {
      inspectPublicDemoDatabaseTarget({
        ...VALID_INPUT,
        databaseUrl: `postgresql://operator:${sensitiveValue}@example.com/auto_parts_demo?sslmode=require`,
      });
    } catch (error) {
      expect((error as Error).message).not.toContain(sensitiveValue);
    }
  });
});
