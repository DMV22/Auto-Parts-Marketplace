import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  STRIPE_WEBHOOK_GATEWAY,
  type StripeWebhookGateway,
  WebhookSignatureVerificationError,
} from './webhook.gateway';
import { WebhookService } from './webhook.service';
import type { StripeWebhookResponse } from './webhook.types';

type StripeWebhookRequest = Request & { rawBody?: Buffer };

@Controller('api/v1/webhooks/stripe')
export class StripeWebhookController {
  constructor(
    @Inject(STRIPE_WEBHOOK_GATEWAY)
    private readonly gateway: StripeWebhookGateway,
    private readonly webhookService: WebhookService,
  ) {}

  @Post()
  @HttpCode(200)
  handle(
    @Req() request: StripeWebhookRequest,
    @Headers('stripe-signature') signature: string | undefined,
  ): StripeWebhookResponse {
    if (!signature || !request.rawBody) {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    try {
      const event = this.gateway.verifyWebhook(request.rawBody, signature);
      return this.webhookService.handle(event);
    } catch (error: unknown) {
      if (error instanceof WebhookSignatureVerificationError) {
        throw new BadRequestException('Invalid Stripe webhook signature');
      }
      throw error;
    }
  }
}
