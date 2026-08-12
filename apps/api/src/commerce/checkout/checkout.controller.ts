import { Body, Controller, Headers, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CommerceActorService } from '../commerce-actor.service';
import type { CommerceActorResolution } from '../commerce.types';
import { GuestCartContextService } from '../guest-cart-context.service';
import { CheckoutService } from './checkout.service';
import type { CheckoutSessionResponse } from './checkout.types';
import {
  CheckoutBodyPipe,
  CheckoutIdempotencyKeyPipe,
} from './checkout.validation';

@Controller('api/v1/checkout/session')
export class CheckoutController {
  constructor(
    private readonly actorService: CommerceActorService,
    private readonly guestContext: GuestCartContextService,
    private readonly checkoutService: CheckoutService,
    private readonly idempotencyKeyPipe: CheckoutIdempotencyKeyPipe,
  ) {}

  @Post()
  async createSession(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Headers('idempotency-key') rawIdempotencyKey: string | undefined,
    @Body(CheckoutBodyPipe) body: Record<string, never>,
  ): Promise<CheckoutSessionResponse> {
    const idempotencyKey = this.idempotencyKeyPipe.transform(rawIdempotencyKey);
    void body;
    const resolution = await this.actorService.resolve(request.headers);
    const data = await this.checkoutService.createSession(
      resolution.actor,
      idempotencyKey,
    );
    this.applyCookie(response, resolution);
    return { data };
  }

  private applyCookie(
    response: Response,
    resolution: CommerceActorResolution,
  ): void {
    if (resolution.clearGuestCookie) {
      response.setHeader('Set-Cookie', this.guestContext.serializeRemoval());
      return;
    }
    if (resolution.guestContext) {
      response.setHeader(
        'Set-Cookie',
        this.guestContext.serialize(resolution.guestContext.token),
      );
    }
  }
}
