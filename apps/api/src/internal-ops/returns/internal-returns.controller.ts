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
import { ReturnsService } from './returns.service';
import type {
  CreateReturnCommand,
  CustomerReturnItem,
  InternalReturnDetail,
  InternalReturnsQuery,
  InternalReturnsResponse,
  ReturnActor,
  ReturnTransitionCommand,
  ReturnTransitionResult,
} from './returns.types';
import {
  CreateReturnPipe,
  InternalReturnsQueryPipe,
  ReturnTransitionPipe,
} from './returns.validation';

@Controller('api/v1/internal')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.SUPPORT_MANAGER, UserRole.ADMIN)
export class InternalReturnsController {
  constructor(private readonly returns: ReturnsService) {}

  @Post('orders/:orderId/items/:orderItemId/returns')
  async create(
    @Req() request: AuthenticatedRequest,
    @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @Param('orderItemId', new ParseUUIDPipe({ version: '4' }))
    orderItemId: string,
    @Body(CreateReturnPipe) command: CreateReturnCommand,
  ): Promise<{ data: CustomerReturnItem }> {
    return {
      data: await this.returns.createForSupport(
        orderId,
        orderItemId,
        command,
        actor(request),
      ),
    };
  }

  @Get('returns')
  list(
    @Query(InternalReturnsQueryPipe) query: InternalReturnsQuery,
  ): Promise<InternalReturnsResponse> {
    return this.returns.listInternal(query);
  }

  @Get('returns/:returnRequestId')
  async detail(
    @Param('returnRequestId', new ParseUUIDPipe({ version: '4' }))
    returnRequestId: string,
  ): Promise<{ data: InternalReturnDetail }> {
    return { data: await this.returns.internalDetail(returnRequestId) };
  }

  @Post('returns/:returnRequestId/transitions')
  async transition(
    @Req() request: AuthenticatedRequest,
    @Param('returnRequestId', new ParseUUIDPipe({ version: '4' }))
    returnRequestId: string,
    @Body(ReturnTransitionPipe) command: ReturnTransitionCommand,
  ): Promise<{ data: ReturnTransitionResult }> {
    return {
      data: await this.returns.transitionInternal(
        returnRequestId,
        command,
        actor(request),
      ),
    };
  }
}

function actor(request: AuthenticatedRequest): ReturnActor {
  const user = request.auth?.user;
  if (!user) throw new UnauthorizedException('Authentication required');
  return { id: user.id, role: user.role };
}
