import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/auth.types';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { UserRole } from '../../generated/prisma/enums';
import type { OrdersPaginationQuery } from '../../commerce/orders/orders.types';
import { OrdersPaginationQueryPipe } from '../../commerce/orders/orders.validation';
import { InternalOrdersService } from './internal-orders.service';
import type {
  InternalOrderDetailResponse,
  InternalOrdersQuery,
  InternalOrdersResponse,
  InternalOrderTimelineResponse,
  InternalOrderTransitionCommand,
  InternalOrderTransitionResponse,
} from './internal-orders.types';
import {
  InternalOrdersQueryPipe,
  InternalOrderTransitionPipe,
} from './internal-orders.validation';

@Controller('api/v1/internal/orders')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.SUPPORT_MANAGER, UserRole.ADMIN)
export class InternalOrdersController {
  constructor(private readonly orders: InternalOrdersService) {}

  @Get()
  list(
    @Query(InternalOrdersQueryPipe) query: InternalOrdersQuery,
  ): Promise<InternalOrdersResponse> {
    return this.orders.list(query);
  }

  @Get(':orderId/timeline')
  timeline(
    @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @Query(OrdersPaginationQueryPipe) query: OrdersPaginationQuery,
  ): Promise<InternalOrderTimelineResponse> {
    return this.orders.timeline(orderId, query);
  }

  @Get(':orderId')
  async detail(
    @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string,
  ): Promise<InternalOrderDetailResponse> {
    return { data: await this.orders.detail(orderId) };
  }

  @Post(':orderId/transitions')
  async transition(
    @Req() request: AuthenticatedRequest,
    @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @Body(InternalOrderTransitionPipe)
    command: InternalOrderTransitionCommand,
  ): Promise<InternalOrderTransitionResponse> {
    const actor = request.auth?.user;
    if (!actor) throw new UnauthorizedException('Authentication required');
    return {
      data: await this.orders.transition(orderId, command, {
        id: actor.id,
        role: actor.role,
      }),
    };
  }
}
