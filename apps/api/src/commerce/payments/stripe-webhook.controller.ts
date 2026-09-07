import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
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
  private readonly logger = new Logger(StripeWebhookController.name);

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
  ): Promise<StripeWebhookResponse> {
    const requestId = randomUUID();

    if (!signature || !request.rawBody) {
      this.logger.warn({
        message: 'stripe_webhook',
        requestId,
        outcome: 'rejected',
        reason: 'missing_signature_or_raw_body',
      });
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    try {
      const event = this.gateway.verifyWebhook(request.rawBody, signature);
      return this.webhookService.handle(event, { requestId });
    } catch (error: unknown) {
      if (error instanceof WebhookSignatureVerificationError) {
        this.logger.warn({
          message: 'stripe_webhook',
          requestId,
          outcome: 'rejected',
          reason: 'invalid_signature',
        });
        throw new BadRequestException('Invalid Stripe webhook signature');
      }
      throw error;
    }
  }
}
