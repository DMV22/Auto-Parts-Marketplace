import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ActivityLogService } from '../internal-ops/activity-log.service';
import { AdminListingsController } from './admin-listings.controller';
import { SupplierListingsController } from './listings/listings.controller';
import { SupplierListingsService } from './listings/listings.service';
import { SupplierOrderItemsController } from './order-items/order-items.controller';
import { SupplierOrderItemsService } from './order-items/order-items.service';

@Module({
  imports: [AuthModule],
  controllers: [
    SupplierListingsController,
    SupplierOrderItemsController,
    AdminListingsController,
  ],
  providers: [
    ActivityLogService,
    SupplierListingsService,
    SupplierOrderItemsService,
  ],
})
export class SupplierCabinetModule {}
