import { loadCheckoutConfig } from './checkout.config';

const VALID_ENV: NodeJS.ProcessEnv = {
  STRIPE_SECRET_KEY: 'sk_test_local_placeholder',
  STRIPE_WEBHOOK_SECRET: 'whsec_test_local_placeholder',
  STRIPE_CHECKOUT_SUCCESS_URL: 'http://localhost:3000/checkout/success',
  STRIPE_CHECKOUT_CANCEL_URL: 'http://localhost:3000/checkout/cancel',
};

describe('loadCheckoutConfig', () => {
  it('returns the server-only Stripe checkout configuration', () => {
    expect(loadCheckoutConfig(VALID_ENV)).toEqual({
      secretKey: 'sk_test_local_placeholder',
      webhookSecret: 'whsec_test_local_placeholder',
      successUrl: 'http://localhost:3000/checkout/success',
      cancelUrl: 'http://localhost:3000/checkout/cancel',
    });
  });

  it.each([
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_CHECKOUT_SUCCESS_URL',
    'STRIPE_CHECKOUT_CANCEL_URL',
  ] as const)('fails fast when %s is missing', (name) => {
    expect(() =>
      loadCheckoutConfig({
        ...VALID_ENV,
        [name]: undefined,
      }),
    ).toThrow(`${name} is required`);
  });

  it.each([
    ['STRIPE_CHECKOUT_SUCCESS_URL', 'not-a-url'],
    ['STRIPE_CHECKOUT_CANCEL_URL', 'ftp://localhost/cart'],
  ] as const)('rejects an invalid redirect URL in %s', (name, value) => {
    expect(() =>
      loadCheckoutConfig({
        ...VALID_ENV,
        [name]: value,
      }),
    ).toThrow(`${name} must be an absolute HTTP(S) URL`);
  });
});
