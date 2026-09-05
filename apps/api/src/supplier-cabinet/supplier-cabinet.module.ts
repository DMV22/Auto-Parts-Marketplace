import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ActivityLogService } from '../internal-ops/activity-log.service';
import { AdminListingsController } from './admin-listings.controller';
import { SupplierListingsController } from './listings/listings.controller';
import { SupplierListingsService } from './listings/listings.service';
import { SupplierOrderItemsController } from './order-items/order-items.controller';
import { SupplierOrderItemsService } from './order-items/order-items.service';
import { SupplierProductVariantsController } from './product-variants/product-variants.controller';
import { SupplierProductVariantsService } from './product-variants/product-variants.service';

@Module({
  imports: [AuthModule],
  controllers: [
    SupplierListingsController,
    SupplierOrderItemsController,
    SupplierProductVariantsController,
    AdminListingsController,
  ],
  providers: [
    ActivityLogService,
    SupplierListingsService,
    SupplierOrderItemsService,
    SupplierProductVariantsService,
  ],
})
export class SupplierCabinetModule {}
