import { Module } from '@nestjs/common';
import { CheckoutModule } from '../checkout/checkout.module';
import { StripeWebhookController } from './stripe-webhook.controller';
import { WebhookService } from './webhook.service';

@Module({
  imports: [CheckoutModule],
  controllers: [StripeWebhookController],
  providers: [WebhookService],
})
export class PaymentsModule {}
