import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SupplierOwned } from '../../auth/decorators/supplier-owned.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { SupplierOwnershipGuard } from '../../auth/guards/supplier-ownership.guard';
import { UserRole } from '../../generated/prisma/enums';
import { SupplierOrderItemsService } from './order-items.service';
import type {
  SupplierOrderItemDto,
  SupplierOrderItemsQuery,
  SupplierOrderItemsResponse,
} from './order-items.types';
import { SupplierOrderItemsQueryPipe } from './order-items.validation';

@Controller('api/v1/suppliers/:supplierId/order-items')
@UseGuards(SessionAuthGuard, RolesGuard, SupplierOwnershipGuard)
@Roles(UserRole.SUPPLIER_USER)
@SupplierOwned()
export class SupplierOrderItemsController {
  constructor(private readonly orderItems: SupplierOrderItemsService) {}

  @Get()
  list(
    @Param('supplierId', new ParseUUIDPipe({ version: '4' }))
    supplierId: string,
    @Query(SupplierOrderItemsQueryPipe) query: SupplierOrderItemsQuery,
  ): Promise<SupplierOrderItemsResponse> {
    return this.orderItems.list(supplierId, query);
  }

  @Get(':orderItemId')
  detail(
    @Param('supplierId', new ParseUUIDPipe({ version: '4' }))
    supplierId: string,
    @Param('orderItemId', new ParseUUIDPipe({ version: '4' }))
    orderItemId: string,
  ): Promise<SupplierOrderItemDto> {
    return this.orderItems.detail(supplierId, orderItemId);
  }
}
