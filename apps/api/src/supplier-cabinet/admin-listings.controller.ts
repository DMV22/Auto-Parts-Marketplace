/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
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
import type { AuthenticatedRequest } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import {
  UserRole,
  type UserRole as UserRoleValue,
} from '../generated/prisma/enums';
import { SupplierListingsService } from './listings/listings.service';
import type {
  AdminModerationQuery,
  AdminModerationResponse,
  RejectSupplierListing,
  SupplierListingDto,
} from './listings/listings.types';
import {
  AdminModerationQueryPipe,
  RejectSupplierListingPipe,
} from './listings/listings.validation';

@Controller('api/v1/admin')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminListingsController {
  constructor(private readonly listings: SupplierListingsService) {}

  @Get('moderation/listings')
  list(
    @Query(AdminModerationQueryPipe) query: AdminModerationQuery,
  ): Promise<AdminModerationResponse> {
    return this.listings.listModeration(query);
  }

  @Post([
    'moderation/listings/:listingId/approve',
    'listings/:listingId/approve',
  ])
  approve(
    @Req() request: AuthenticatedRequest,
    @Param('listingId', new ParseUUIDPipe({ version: '4' }))
    listingId: string,
  ): Promise<SupplierListingDto> {
    return this.listings.transitionAdminListing(
      listingId,
      'approve',
      undefined,
      actor(request),
    );
  }

  @Post(['moderation/listings/:listingId/reject', 'listings/:listingId/reject'])
  reject(
    @Req() request: AuthenticatedRequest,
    @Param('listingId', new ParseUUIDPipe({ version: '4' }))
    listingId: string,
    @Body(RejectSupplierListingPipe) command: RejectSupplierListing,
  ): Promise<SupplierListingDto> {
    return this.listings.transitionAdminListing(
      listingId,
      'reject',
      command.reason,
      actor(request),
    );
  }

  @Post('moderation/listings/:listingId/pause')
  pause(
    @Req() request: AuthenticatedRequest,
    @Param('listingId', new ParseUUIDPipe({ version: '4' }))
    listingId: string,
    @Body(RejectSupplierListingPipe) command: RejectSupplierListing,
  ): Promise<SupplierListingDto> {
    return this.listings.transitionAdminListing(
      listingId,
      'pause',
      command.reason,
      actor(request),
    );
  }
}

function actor(request: AuthenticatedRequest): {
  id: string;
  role: UserRoleValue;
} {
  const user = request.auth?.user;
  if (!user) throw new UnauthorizedException('Authentication required');
  return { id: user.id, role: user.role };
}
