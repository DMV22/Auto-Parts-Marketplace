import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/auth.types';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { UserRole } from '../../generated/prisma/enums';
import { ReturnsService } from './returns.service';
import type {
  CreateReturnCommand,
  CustomerReturnItem,
  CustomerReturnsResponse,
  ReturnActor,
  ReturnTransitionResult,
} from './returns.types';
import { CreateReturnPipe } from './returns.validation';

@Controller('api/v1/orders/:orderId/items/:orderItemId/returns')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class CustomerReturnsController {
  constructor(private readonly returns: ReturnsService) {}

  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @Param('orderItemId', new ParseUUIDPipe({ version: '4' }))
    orderItemId: string,
    @Body(CreateReturnPipe) command: CreateReturnCommand,
  ): Promise<{ data: CustomerReturnItem }> {
    const actor = authenticatedCustomer(request);
    return {
      data: await this.returns.createForCustomer(
        orderId,
        orderItemId,
        command,
        actor,
      ),
    };
  }

  @Get()
  async list(
    @Req() request: AuthenticatedRequest,
    @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @Param('orderItemId', new ParseUUIDPipe({ version: '4' }))
    orderItemId: string,
  ): Promise<CustomerReturnsResponse> {
    const actor = authenticatedCustomer(request);
    return {
      data: await this.returns.listForCustomer(orderId, orderItemId, actor.id),
    };
  }

  @Post(':returnRequestId/cancel')
  async cancel(
    @Req() request: AuthenticatedRequest,
    @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @Param('orderItemId', new ParseUUIDPipe({ version: '4' }))
    orderItemId: string,
    @Param('returnRequestId', new ParseUUIDPipe({ version: '4' }))
    returnRequestId: string,
  ): Promise<{ data: ReturnTransitionResult }> {
    const actor = authenticatedCustomer(request);
    return {
      data: await this.returns.cancelForCustomer(
        orderId,
        orderItemId,
        returnRequestId,
        actor,
      ),
    };
  }
}

function authenticatedCustomer(request: AuthenticatedRequest): ReturnActor {
  const actor = request.auth?.user;
  if (!actor) throw new UnauthorizedException('Authentication required');
  return { id: actor.id, role: actor.role };
}
