import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CommerceActorService } from '../commerce-actor.service';
import type { CommerceActorResolution } from '../commerce.types';
import { GuestCartContextService } from '../guest-cart-context.service';
import { OrdersService } from './orders.service';
import type {
  OrderDetailResponse,
  OrderHistoryResponse,
  OrdersPaginationQuery,
  OrderTimelineResponse,
} from './orders.types';
import { OrdersPaginationQueryPipe } from './orders.validation';

@Controller('api/v1/orders')
export class OrdersController {
  constructor(
    private readonly actorService: CommerceActorService,
    private readonly guestContext: GuestCartContextService,
    private readonly ordersService: OrdersService,
  ) {}

  @Get()
  async list(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Query(OrdersPaginationQueryPipe) query: OrdersPaginationQuery,
  ): Promise<OrderHistoryResponse> {
    const resolution = await this.actorService.resolve(request.headers);
    const result = await this.ordersService.list(resolution.actor, query);
    this.applyCookie(response, resolution);
    return result;
  }

  @Get(':orderId/timeline')
  async timeline(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Query(OrdersPaginationQueryPipe) query: OrdersPaginationQuery,
  ): Promise<OrderTimelineResponse> {
    const resolution = await this.actorService.resolve(request.headers);
    const result = await this.ordersService.timeline(
      resolution.actor,
      orderId,
      query,
    );
    this.applyCookie(response, resolution);
    return result;
  }

  @Get(':orderId')
  async detail(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<OrderDetailResponse> {
    const resolution = await this.actorService.resolve(request.headers);
    const data = await this.ordersService.detail(resolution.actor, orderId);
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
    if (resolution.guestContext?.isNew) {
      response.setHeader(
        'Set-Cookie',
        this.guestContext.serialize(resolution.guestContext.token),
      );
    }
  }
}
