import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SupplierOwned } from '../../auth/decorators/supplier-owned.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { SupplierOwnershipGuard } from '../../auth/guards/supplier-ownership.guard';
import { UserRole } from '../../generated/prisma/enums';
import { SupplierListingsService } from './listings.service';
import type {
  CreateSupplierListing,
  SupplierListingDto,
  SupplierListingAction,
  SupplierListingsQuery,
  SupplierListingsResponse,
  UpdateSupplierListing,
} from './listings.types';
import {
  CreateSupplierListingPipe,
  SupplierListingsQueryPipe,
  UpdateSupplierListingPipe,
} from './listings.validation';

@Controller('api/v1/suppliers/:supplierId/listings')
@UseGuards(SessionAuthGuard, RolesGuard, SupplierOwnershipGuard)
@Roles(UserRole.SUPPLIER_USER)
@SupplierOwned()
export class SupplierListingsController {
  constructor(private readonly listings: SupplierListingsService) {}

  @Get()
  list(
    @Param('supplierId', new ParseUUIDPipe({ version: '4' }))
    supplierId: string,
    @Query(SupplierListingsQueryPipe) query: SupplierListingsQuery,
  ): Promise<SupplierListingsResponse> {
    return this.listings.list(supplierId, query);
  }

  @Post()
  create(
    @Param('supplierId', new ParseUUIDPipe({ version: '4' }))
    supplierId: string,
    @Body(CreateSupplierListingPipe) command: CreateSupplierListing,
  ): Promise<SupplierListingDto> {
    return this.listings.create(supplierId, command);
  }

  @Get(':listingId')
  get(
    @Param('supplierId', new ParseUUIDPipe({ version: '4' }))
    supplierId: string,
    @Param('listingId', new ParseUUIDPipe({ version: '4' }))
    listingId: string,
  ): Promise<SupplierListingDto> {
    return this.listings.get(supplierId, listingId);
  }

  @Patch(':listingId')
  update(
    @Param('supplierId', new ParseUUIDPipe({ version: '4' }))
    supplierId: string,
    @Param('listingId', new ParseUUIDPipe({ version: '4' }))
    listingId: string,
    @Body(UpdateSupplierListingPipe) command: UpdateSupplierListing,
  ): Promise<SupplierListingDto> {
    return this.listings.update(supplierId, listingId, command);
  }

  @Post(':listingId/submit')
  submit(
    @Param('supplierId', new ParseUUIDPipe({ version: '4' }))
    supplierId: string,
    @Param('listingId', new ParseUUIDPipe({ version: '4' }))
    listingId: string,
  ): Promise<SupplierListingDto> {
    return this.transition(supplierId, listingId, 'submit');
  }

  @Post(':listingId/pause')
  pause(
    @Param('supplierId', new ParseUUIDPipe({ version: '4' }))
    supplierId: string,
    @Param('listingId', new ParseUUIDPipe({ version: '4' }))
    listingId: string,
  ): Promise<SupplierListingDto> {
    return this.transition(supplierId, listingId, 'pause');
  }

  @Post(':listingId/resume')
  resume(
    @Param('supplierId', new ParseUUIDPipe({ version: '4' }))
    supplierId: string,
    @Param('listingId', new ParseUUIDPipe({ version: '4' }))
    listingId: string,
  ): Promise<SupplierListingDto> {
    return this.transition(supplierId, listingId, 'resume');
  }

  @Post(':listingId/archive')
  archive(
    @Param('supplierId', new ParseUUIDPipe({ version: '4' }))
    supplierId: string,
    @Param('listingId', new ParseUUIDPipe({ version: '4' }))
    listingId: string,
  ): Promise<SupplierListingDto> {
    return this.transition(supplierId, listingId, 'archive');
  }

  private transition(
    supplierId: string,
    listingId: string,
    action: SupplierListingAction,
  ): Promise<SupplierListingDto> {
    return this.listings.transitionSupplierListing(
      supplierId,
      listingId,
      action,
    );
  }
}
