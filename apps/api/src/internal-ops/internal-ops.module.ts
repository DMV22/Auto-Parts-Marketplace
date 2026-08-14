import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrdersPaginationQueryPipe } from '../commerce/orders/orders.validation';
import { ActivityLogService } from './activity-log.service';
import { ActivityController } from './activity/activity.controller';
import { ActivityService } from './activity/activity.service';
import { ActivityQueryPipe } from './activity/activity.validation';
import { InternalNotesController } from './notes/internal-notes.controller';
import { InternalNotesService } from './notes/internal-notes.service';
import {
  CreateNotePipe,
  NotesQueryPipe,
  RedactNotePipe,
} from './notes/internal-notes.validation';
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
    InternalNotesController,
    ActivityController,
  ],
  providers: [
    ActivityLogService,
    ActivityService,
    ActivityQueryPipe,
    InternalNotesService,
    CreateNotePipe,
    NotesQueryPipe,
    RedactNotePipe,
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
