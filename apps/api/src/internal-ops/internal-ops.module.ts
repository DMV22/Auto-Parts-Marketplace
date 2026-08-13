import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrdersPaginationQueryPipe } from '../commerce/orders/orders.validation';
import { ActivityLogService } from './activity-log.service';
import { InternalOrdersController } from './orders/internal-orders.controller';
import { InternalOrdersService } from './orders/internal-orders.service';
import {
  InternalOrdersQueryPipe,
  InternalOrderTransitionPipe,
} from './orders/internal-orders.validation';
import { CustomerReturnsController } from './returns/customer-returns.controller';
import { InternalReturnsController } from './returns/internal-returns.controller';
import { ReturnsService } from './returns/returns.service';
import {
  CreateReturnPipe,
  InternalReturnsQueryPipe,
  ReturnTransitionPipe,
} from './returns/returns.validation';

@Module({
  imports: [AuthModule],
  controllers: [
    InternalOrdersController,
    CustomerReturnsController,
    InternalReturnsController,
  ],
  providers: [
    ActivityLogService,
    InternalOrdersService,
    ReturnsService,
    CreateReturnPipe,
    InternalReturnsQueryPipe,
    ReturnTransitionPipe,
    InternalOrdersQueryPipe,
    InternalOrderTransitionPipe,
    OrdersPaginationQueryPipe,
  ],
})
export class InternalOpsModule {}
