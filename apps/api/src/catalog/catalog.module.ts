import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CatalogSessionService } from './catalog-session.service';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { FitmentService } from './fitment/fitment.service';
import { ProductDetailController } from './product-detail/product-detail.controller';
import { ProductDetailService } from './product-detail/product-detail.service';
import { VehicleContextService } from './vehicle-context/vehicle-context.service';

@Module({
  imports: [AuthModule],
  controllers: [CatalogController, ProductDetailController],
  providers: [
    CatalogService,
    CatalogSessionService,
    FitmentService,
    ProductDetailService,
    VehicleContextService,
  ],
  exports: [CatalogService, FitmentService],
})
export class CatalogModule {}
