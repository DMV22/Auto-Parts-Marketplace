import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { VerifiedStripeWebhookEvent } from './webhook.gateway';
import type { StripeWebhookResponse } from './webhook.types';

const SUPPORTED_EVENTS = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
]);

@Injectable()
export class WebhookService {
  handle(event: VerifiedStripeWebhookEvent): StripeWebhookResponse {
    if (SUPPORTED_EVENTS.has(event.type)) {
      throw new ServiceUnavailableException(
        'Stripe webhook processing is not available',
      );
    }

    return { received: true };
  }
}
