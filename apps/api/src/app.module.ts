import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { CartModule } from './commerce/cart/cart.module';
import { CheckoutModule } from './commerce/checkout/checkout.module';
import { OrdersModule } from './commerce/orders/orders.module';
import { PaymentsModule } from './commerce/payments/payments.module';
import { GarageModule } from './garage/garage.module';
import { HealthModule } from './health/health.module';
import { InternalOpsModule } from './internal-ops/internal-ops.module';
import { PrismaModule } from './prisma/prisma.module';
import { SecurityModule } from './security/security.module';
import { SupplierCabinetModule } from './supplier-cabinet/supplier-cabinet.module';
import { VehicleTaxonomyModule } from './vehicle-taxonomy/vehicle-taxonomy.module';

@Module({
  imports: [
    PrismaModule,
    SecurityModule,
    HealthModule,
    AuthModule,
    VehicleTaxonomyModule,
    GarageModule,
    CatalogModule,
    CartModule,
    CheckoutModule,
    PaymentsModule,
    OrdersModule,
    SupplierCabinetModule,
    InternalOpsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
