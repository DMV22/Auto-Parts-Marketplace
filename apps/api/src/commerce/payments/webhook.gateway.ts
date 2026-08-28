export const STRIPE_WEBHOOK_GATEWAY = Symbol('STRIPE_WEBHOOK_GATEWAY');

export type VerifiedStripeWebhookEvent = {
  externalEventId: string;
  type: string;
  payload: Record<string, unknown>;
  checkoutSession: {
    id: string;
    orderId: string | null;
    paymentStatus: string | null;
    currency: string | null;
    amountTotal: number | null;
  } | null;
};

export interface StripeWebhookGateway {
  verifyWebhook(rawBody: Buffer, signature: string): VerifiedStripeWebhookEvent;
}

export class WebhookSignatureVerificationError extends Error {
  constructor(options?: ErrorOptions) {
    super('Stripe webhook signature verification failed', options);
    this.name = 'WebhookSignatureVerificationError';
  }
}
