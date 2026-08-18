import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrdersPaginationQueryPipe } from '../commerce/orders/orders.validation';
import { InternalOrdersController } from './orders/internal-orders.controller';
import { InternalOrdersService } from './orders/internal-orders.service';
import {
  InternalOrdersQueryPipe,
  InternalOrderTransitionPipe,
} from './orders/internal-orders.validation';

@Module({
  imports: [AuthModule],
  controllers: [InternalOrdersController],
  providers: [
    InternalOrdersService,
    InternalOrdersQueryPipe,
    InternalOrderTransitionPipe,
    OrdersPaginationQueryPipe,
  ],
})
export class InternalOpsModule {}
