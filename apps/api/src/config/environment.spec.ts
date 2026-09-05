import { validateApiEnvironment } from './environment';

const LOCAL_ENV: NodeJS.ProcessEnv = {
  NODE_ENV: 'development',
  DATABASE_URL:
    'postgresql://user:password@localhost:5433/auto_parts_dev?schema=public',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:3000',
  GOOGLE_CLIENT_ID: 'local-google-client-id',
  GOOGLE_CLIENT_SECRET: 'local-google-client-secret',
  STRIPE_SECRET_KEY: 'sk_test_local_key',
  STRIPE_WEBHOOK_SECRET: 'whsec_local_secret',
  STRIPE_CHECKOUT_SUCCESS_URL: 'http://localhost:3000/checkout/success',
  STRIPE_CHECKOUT_CANCEL_URL: 'http://localhost:3000/checkout/cancel',
};

const PUBLIC_DEMO_ENV: NodeJS.ProcessEnv = {
  ...LOCAL_ENV,
  NODE_ENV: 'production',
  PORT: '10000',
  DATABASE_URL:
    'postgresql://user:password@example-pooler.neon.tech/demo?sslmode=require',
  BETTER_AUTH_URL: 'https://example.vercel.app',
  STRIPE_CHECKOUT_SUCCESS_URL: 'https://example.vercel.app/checkout/success',
  STRIPE_CHECKOUT_CANCEL_URL: 'https://example.vercel.app/checkout/cancel',
};

describe('validateApiEnvironment', () => {
  it('accepts the local development contract and defaults the port', () => {
    expect(validateApiEnvironment(LOCAL_ENV)).toEqual({
      nodeEnv: 'development',
      port: 3001,
    });
  });

  it('accepts a TLS-only public-demo contract with Stripe test mode', () => {
    expect(validateApiEnvironment(PUBLIC_DEMO_ENV)).toEqual({
      nodeEnv: 'production',
      port: 10000,
    });
  });

  it('uses the guarded test database variable in test mode', () => {
    expect(
      validateApiEnvironment({
        ...LOCAL_ENV,
        NODE_ENV: 'test',
        DATABASE_URL: undefined,
        TEST_DATABASE_URL:
          'postgresql://user:password@localhost:5433/auto_parts_test?schema=public',
      }),
    ).toEqual({ nodeEnv: 'test', port: 3001 });
  });

  it('reports missing variables by name without exposing configured secrets', () => {
    const privateValue = 'private-value-that-must-not-appear';

    expect(() =>
      validateApiEnvironment({
        ...LOCAL_ENV,
        DATABASE_URL: undefined,
        GOOGLE_CLIENT_SECRET: privateValue,
      }),
    ).toThrow('DATABASE_URL is required');

    try {
      validateApiEnvironment({
        ...LOCAL_ENV,
        DATABASE_URL: undefined,
        GOOGLE_CLIENT_SECRET: privateValue,
      });
    } catch (error: unknown) {
      expect(String(error)).not.toContain(privateValue);
    }
  });

  it.each([
    ['live Stripe key', { STRIPE_SECRET_KEY: 'sk_live_private' }],
    ['HTTP auth URL', { BETTER_AUTH_URL: 'http://example.vercel.app' }],
    [
      'foreign Checkout origin',
      {
        STRIPE_CHECKOUT_SUCCESS_URL:
          'https://different.example/checkout/success',
      },
    ],
    [
      'non-TLS database',
      {
        DATABASE_URL: 'postgresql://user:password@example.neon.tech/demo',
      },
    ],
    ['test database variable', { TEST_DATABASE_URL: 'configured' }],
  ] as const)('rejects %s in the public-demo environment', (_label, change) => {
    expect(() =>
      validateApiEnvironment({ ...PUBLIC_DEMO_ENV, ...change }),
    ).toThrow('Invalid API environment configuration');
  });

  it('rejects placeholder values in the public-demo environment', () => {
    expect(() =>
      validateApiEnvironment({
        ...PUBLIC_DEMO_ENV,
        GOOGLE_CLIENT_SECRET: 'REPLACE_WITH_SECRET',
      }),
    ).toThrow('GOOGLE_CLIENT_SECRET must not use a placeholder in production');
  });

  it('rejects an invalid port without echoing its value', () => {
    const invalidPort = 'private-invalid-port';

    expect(() =>
      validateApiEnvironment({ ...LOCAL_ENV, PORT: invalidPort }),
    ).toThrow('PORT must be an integer between 1 and 65535');

    try {
      validateApiEnvironment({ ...LOCAL_ENV, PORT: invalidPort });
    } catch (error: unknown) {
      expect(String(error)).not.toContain(invalidPort);
    }
  });
});
