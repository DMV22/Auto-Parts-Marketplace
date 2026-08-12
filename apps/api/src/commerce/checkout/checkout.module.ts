import { Module } from '@nestjs/common';
import { CommerceModule } from '../commerce.module';
import { CHECKOUT_CONFIG, loadCheckoutConfig } from './checkout.config';
import { CheckoutController } from './checkout.controller';
import { CHECKOUT_GATEWAY } from './checkout.gateway';
import { CheckoutService } from './checkout.service';
import { StripeCheckoutGateway } from './stripe-checkout.gateway';
import { STRIPE_WEBHOOK_GATEWAY } from '../payments/webhook.gateway';
import {
  CheckoutBodyPipe,
  CheckoutIdempotencyKeyPipe,
} from './checkout.validation';

@Module({
  imports: [CommerceModule],
  controllers: [CheckoutController],
  providers: [
    CheckoutService,
    CheckoutBodyPipe,
    CheckoutIdempotencyKeyPipe,
    { provide: CHECKOUT_CONFIG, useFactory: loadCheckoutConfig },
    StripeCheckoutGateway,
    { provide: CHECKOUT_GATEWAY, useExisting: StripeCheckoutGateway },
    { provide: STRIPE_WEBHOOK_GATEWAY, useExisting: StripeCheckoutGateway },
  ],
  exports: [CheckoutService, STRIPE_WEBHOOK_GATEWAY],
})
export class CheckoutModule {}
