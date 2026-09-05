import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth.types';
import { SessionAuthGuard } from '../guards/session-auth.guard';
import { SupplierMembershipService } from './supplier-membership.service';
import type { CurrentSupplierMembershipDto } from './supplier-membership.types';

@Controller('api/v1/me/supplier-membership')
@UseGuards(SessionAuthGuard)
export class SupplierMembershipController {
  constructor(private readonly memberships: SupplierMembershipService) {}

  @Get()
  getCurrent(
    @Req() request: AuthenticatedRequest,
  ): Promise<CurrentSupplierMembershipDto> {
    return this.memberships.getCurrent(request.auth!.user.id);
  }
}
