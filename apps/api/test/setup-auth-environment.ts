process.env.BETTER_AUTH_SECRET =
  'test-only-better-auth-secret-at-least-32-characters';
process.env.BETTER_AUTH_URL = 'http://localhost:3001';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.STRIPE_SECRET_KEY = 'sk_test_synthetic_checkout_key';
process.env.STRIPE_CHECKOUT_SUCCESS_URL =
  'http://localhost:3000/checkout/success?session_id={CHECKOUT_SESSION_ID}';
process.env.STRIPE_CHECKOUT_CANCEL_URL = 'http://localhost:3000/cart';
