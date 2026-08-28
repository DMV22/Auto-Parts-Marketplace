import {
  Controller,
  Get,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/auth.types';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { UserRole } from '../../generated/prisma/enums';
import { ActivityService } from './activity.service';
import type { ActivityQuery, ActivityResponse } from './activity.types';
import { ActivityQueryPipe } from './activity.validation';

@Controller('api/v1/internal/activity')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.SUPPORT_MANAGER, UserRole.ADMIN)
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query(ActivityQueryPipe) query: ActivityQuery,
  ): Promise<ActivityResponse> {
    const user = request.auth?.user;
    if (!user) throw new UnauthorizedException('Authentication required');
    return this.activity.list(query, user.role);
  }
}
