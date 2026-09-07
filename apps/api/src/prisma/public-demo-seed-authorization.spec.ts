import {
  authorizePublicDemoSeed,
  publicDemoSeedConfirmation,
  type PublicDemoSeedAuthorizationInput,
} from './public-demo-seed-authorization';

const SEED_VERSION = 'test-seed-v1';
const DATABASE_URL =
  'postgresql://operator:not-a-real-secret@ep-demo.eu-central-1.aws.neon.tech/auto_parts_demo?sslmode=require';
const VALID_INPUT: PublicDemoSeedAuthorizationInput = {
  nodeEnv: 'production',
  databaseUrl: DATABASE_URL,
  expectedDatabaseName: 'auto_parts_demo',
  testDatabaseUrl: undefined,
  confirmation: publicDemoSeedConfirmation(SEED_VERSION),
  seedVersion: SEED_VERSION,
};

describe('authorizePublicDemoSeed', () => {
  it('authorizes an explicitly confirmed seed version for an approved target', () => {
    expect(authorizePublicDemoSeed(VALID_INPUT)).toEqual({
      databaseUrl: DATABASE_URL,
      target: {
        host: 'ep-demo.eu-central-1.aws.neon.tech',
        databaseName: 'auto_parts_demo',
        connectionType: 'direct',
        sslMode: 'require',
      },
    });
  });

  it.each([
    ['development environment', { nodeEnv: 'development' }],
    ['missing environment', { nodeEnv: undefined }],
    ['missing confirmation', { confirmation: undefined }],
    [
      'different seed version',
      { confirmation: 'APPLY_SYNTHETIC_DEMO_DATA:v0' },
    ],
    ['configured test database', { testDatabaseUrl: 'configured' }],
    [
      'non-Neon target',
      {
        databaseUrl:
          'postgresql://operator:secret@example.com/auto_parts_demo?sslmode=require',
      },
    ],
  ])('rejects %s', (_case, override) => {
    expect(() =>
      authorizePublicDemoSeed({ ...VALID_INPUT, ...override }),
    ).toThrow();
  });

  it('does not include database credentials in a rejection', () => {
    const sensitiveValue = 'credential-that-must-not-be-logged';

    try {
      authorizePublicDemoSeed({
        ...VALID_INPUT,
        databaseUrl: `postgresql://operator:${sensitiveValue}@example.com/auto_parts_demo?sslmode=require`,
      });
    } catch (error) {
      expect((error as Error).message).not.toContain(sensitiveValue);
    }
  });
});
