import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupplierListingsController } from './listings/listings.controller';
import { SupplierListingsService } from './listings/listings.service';

@Module({
  imports: [AuthModule],
  controllers: [SupplierListingsController],
  providers: [SupplierListingsService],
})
export class SupplierCabinetModule {}
