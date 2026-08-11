import { Inject, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { CHECKOUT_CONFIG, type CheckoutConfig } from './checkout.config';
import {
  type CheckoutGateway,
  type CheckoutGatewaySession,
  type CreateCheckoutSessionCommand,
} from './checkout.gateway';

@Injectable()
export class StripeCheckoutGateway implements CheckoutGateway {
  private readonly stripe: Stripe;

  constructor(
    @Inject(CHECKOUT_CONFIG) private readonly config: CheckoutConfig,
  ) {
    this.stripe = new Stripe(config.secretKey);
  }

  async createSession(
    command: CreateCheckoutSessionCommand,
  ): Promise<CheckoutGatewaySession> {
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: 'payment',
        success_url: this.config.successUrl,
        cancel_url: this.config.cancelUrl,
        client_reference_id: command.orderId,
        metadata: {
          orderId: command.orderId,
        },
        expires_at: Math.floor(command.expiresAt.getTime() / 1000),
        line_items: command.lineItems.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: item.currency.toLowerCase(),
            unit_amount: item.unitAmount,
            product_data: {
              name: item.name,
            },
          },
        })),
      },
      {
        idempotencyKey: command.idempotencyKey,
      },
    );

    if (!session.url) {
      throw new Error('Stripe Checkout Session did not include a redirect URL');
    }

    return {
      id: session.id,
      url: session.url,
      expiresAt: new Date(session.expires_at * 1000),
    };
  }
}
