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
import { PrismaModule } from './prisma/prisma.module';
import { VehicleTaxonomyModule } from './vehicle-taxonomy/vehicle-taxonomy.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    VehicleTaxonomyModule,
    GarageModule,
    CatalogModule,
    CartModule,
    CheckoutModule,
    PaymentsModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
