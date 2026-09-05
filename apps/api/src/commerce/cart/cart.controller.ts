import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CommerceActorService } from '../commerce-actor.service';
import type { CommerceActorResolution } from '../commerce.types';
import { GuestCartContextService } from '../guest-cart-context.service';
import { CartService } from './cart.service';
import type {
  AddCartItemInput,
  CartResponse,
  UpdateCartItemInput,
} from './cart.types';
import { CartAddItemBodyPipe, CartUpdateItemBodyPipe } from './cart.validation';
import { DemoRateLimit } from '../../security/rate-limit';

@Controller('api/v1/cart')
export class CartController {
  constructor(
    private readonly actorService: CommerceActorService,
    private readonly guestContext: GuestCartContextService,
    private readonly cartService: CartService,
  ) {}

  @Get()
  async get(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CartResponse> {
    const resolution = await this.actorService.resolve(request.headers);
    const data = await this.cartService.get(resolution.actor);
    this.applyCookie(response, resolution, false);
    return { data };
  }

  @Post('items')
  @DemoRateLimit('mutation')
  async add(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body(CartAddItemBodyPipe) input: AddCartItemInput,
  ): Promise<CartResponse> {
    const resolution = await this.actorService.resolve(request.headers);
    const data = await this.cartService.add(resolution.actor, input);
    this.applyCookie(response, resolution, true);
    return { data };
  }

  @Patch('items/:itemId')
  @DemoRateLimit('mutation')
  async update(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body(CartUpdateItemBodyPipe) input: UpdateCartItemInput,
  ): Promise<CartResponse> {
    const resolution = await this.actorService.resolve(request.headers);
    const data = await this.cartService.update(resolution.actor, itemId, input);
    this.applyCookie(response, resolution, true);
    return { data };
  }

  @Delete('items/:itemId')
  @DemoRateLimit('mutation')
  async remove(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<CartResponse> {
    const resolution = await this.actorService.resolve(request.headers);
    const data = await this.cartService.remove(resolution.actor, itemId);
    this.applyCookie(response, resolution, true);
    return { data };
  }

  @Delete()
  @DemoRateLimit('mutation')
  async clear(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CartResponse> {
    const resolution = await this.actorService.resolve(request.headers);
    const data = await this.cartService.clear(resolution.actor);
    this.applyCookie(response, resolution, true);
    return { data };
  }

  private applyCookie(
    response: Response,
    resolution: CommerceActorResolution,
    refreshGuestCookie: boolean,
  ): void {
    if (resolution.clearGuestCookie) {
      response.setHeader('Set-Cookie', this.guestContext.serializeRemoval());
      return;
    }
    if (
      resolution.guestContext &&
      (resolution.guestContext.isNew || refreshGuestCookie)
    ) {
      response.setHeader(
        'Set-Cookie',
        this.guestContext.serialize(resolution.guestContext.token),
      );
    }
  }
}
