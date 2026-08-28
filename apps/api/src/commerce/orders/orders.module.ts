import { Module } from '@nestjs/common';
import { CommerceModule } from '../commerce.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersPaginationQueryPipe } from './orders.validation';

@Module({
  imports: [CommerceModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersPaginationQueryPipe],
})
export class OrdersModule {}
