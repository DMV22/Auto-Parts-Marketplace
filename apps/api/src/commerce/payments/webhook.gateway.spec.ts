import Stripe from 'stripe';
import type { CheckoutConfig } from '../checkout/checkout.config';
import { StripeCheckoutGateway } from '../checkout/stripe-checkout.gateway';
import { WebhookSignatureVerificationError } from './webhook.gateway';

const CONFIG: CheckoutConfig = {
  secretKey: 'sk_test_local_placeholder',
  webhookSecret: 'whsec_test_local_webhook_secret',
  successUrl:
    'http://localhost:3000/checkout/success?session_id={CHECKOUT_SESSION_ID}',
  cancelUrl: 'http://localhost:3000/cart',
};

const RAW_EVENT = Buffer.from(
  JSON.stringify({
    id: 'evt_checkout_paid',
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_checkout_paid',
        object: 'checkout.session',
        payment_status: 'paid',
        currency: 'uah',
        amount_total: 25000,
        metadata: { orderId: '85000000-0000-4000-8000-000000000001' },
      },
    },
  }),
);

describe('Stripe webhook gateway', () => {
  const stripe = new Stripe(CONFIG.secretKey);
  const gateway = new StripeCheckoutGateway(CONFIG);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload: RAW_EVENT.toString('utf8'),
    secret: CONFIG.webhookSecret,
  });

  it('verifies exact bytes and normalizes a Checkout Session event', () => {
    expect(gateway.verifyWebhook(RAW_EVENT, signature)).toMatchObject({
      externalEventId: 'evt_checkout_paid',
      type: 'checkout.session.completed',
      checkoutSession: {
        id: 'cs_checkout_paid',
        orderId: '85000000-0000-4000-8000-000000000001',
        paymentStatus: 'paid',
        currency: 'uah',
        amountTotal: 25000,
      },
    });
  });

  it('rejects the same signature when the raw payload changes', () => {
    expect(() =>
      gateway.verifyWebhook(
        Buffer.concat([RAW_EVENT, Buffer.from(' ')]),
        signature,
      ),
    ).toThrow(WebhookSignatureVerificationError);
  });
});
