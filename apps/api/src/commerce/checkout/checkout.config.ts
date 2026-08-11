export interface CheckoutConfig {
  secretKey: string;
  successUrl: string;
  cancelUrl: string;
}

export const CHECKOUT_CONFIG = Symbol('CHECKOUT_CONFIG');

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function absoluteHttpUrl(env: NodeJS.ProcessEnv, name: string): string {
  const value = required(env, name);

  try {
    const url = new URL(value);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Unsupported protocol');
    }
  } catch {
    throw new Error(`${name} must be an absolute HTTP(S) URL`);
  }

  return value;
}

export function loadCheckoutConfig(
  env: NodeJS.ProcessEnv = process.env,
): CheckoutConfig {
  return {
    secretKey: required(env, 'STRIPE_SECRET_KEY'),
    successUrl: absoluteHttpUrl(env, 'STRIPE_CHECKOUT_SUCCESS_URL'),
    cancelUrl: absoluteHttpUrl(env, 'STRIPE_CHECKOUT_CANCEL_URL'),
  };
}
