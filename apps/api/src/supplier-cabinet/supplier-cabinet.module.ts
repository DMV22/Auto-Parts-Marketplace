import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminListingsController } from './admin-listings.controller';
import { SupplierListingsController } from './listings/listings.controller';
import { SupplierListingsService } from './listings/listings.service';

@Module({
  imports: [AuthModule],
  controllers: [SupplierListingsController, AdminListingsController],
  providers: [SupplierListingsService],
})
export class SupplierCabinetModule {}
