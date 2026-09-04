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
import { SupplierProductVariantsService } from './product-variants.service';
import type {
  SupplierProductVariantDetailResponse,
  SupplierProductVariantsQuery,
  SupplierProductVariantsResponse,
} from './product-variants.types';
import { SupplierProductVariantsQueryPipe } from './product-variants.validation';

@Controller('api/v1/suppliers/:supplierId/product-variants')
@UseGuards(SessionAuthGuard, RolesGuard, SupplierOwnershipGuard)
@Roles(UserRole.SUPPLIER_USER)
@SupplierOwned()
export class SupplierProductVariantsController {
  constructor(
    private readonly productVariants: SupplierProductVariantsService,
  ) {}

  @Get()
  list(
    @Param('supplierId', new ParseUUIDPipe({ version: '4' }))
    _supplierId: string,
    @Query(SupplierProductVariantsQueryPipe)
    query: SupplierProductVariantsQuery,
  ): Promise<SupplierProductVariantsResponse> {
    return this.productVariants.list(query);
  }

  @Get(':productVariantId')
  detail(
    @Param('supplierId', new ParseUUIDPipe({ version: '4' }))
    _supplierId: string,
    @Param('productVariantId', new ParseUUIDPipe({ version: '4' }))
    productVariantId: string,
  ): Promise<SupplierProductVariantDetailResponse> {
    return this.productVariants.detail(productVariantId);
  }
}
