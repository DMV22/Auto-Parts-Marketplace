import { Module } from '@nestjs/common';
import { CommerceModule } from '../commerce.module';
import { CHECKOUT_CONFIG, loadCheckoutConfig } from './checkout.config';
import { CheckoutController } from './checkout.controller';
import { CHECKOUT_GATEWAY } from './checkout.gateway';
import { CheckoutService } from './checkout.service';
import { StripeCheckoutGateway } from './stripe-checkout.gateway';
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
    { provide: CHECKOUT_GATEWAY, useClass: StripeCheckoutGateway },
  ],
  exports: [CheckoutService],
})
export class CheckoutModule {}
