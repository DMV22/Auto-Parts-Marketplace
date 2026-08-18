import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { UserRole } from '../generated/prisma/enums';
import { SupplierListingsService } from './listings/listings.service';
import type {
  RejectSupplierListing,
  SupplierListingDto,
} from './listings/listings.types';
import { RejectSupplierListingPipe } from './listings/listings.validation';

@Controller('api/v1/admin/listings')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminListingsController {
  constructor(private readonly listings: SupplierListingsService) {}

  @Post(':listingId/approve')
  approve(
    @Param('listingId', new ParseUUIDPipe({ version: '4' }))
    listingId: string,
  ): Promise<SupplierListingDto> {
    return this.listings.transitionAdminListing(listingId, 'approve');
  }

  @Post(':listingId/reject')
  reject(
    @Param('listingId', new ParseUUIDPipe({ version: '4' }))
    listingId: string,
    @Body(RejectSupplierListingPipe) command: RejectSupplierListing,
  ): Promise<SupplierListingDto> {
    return this.listings.transitionAdminListing(
      listingId,
      'reject',
      command.reason,
    );
  }
}
