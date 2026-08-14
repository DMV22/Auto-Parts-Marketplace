import { ForbiddenException } from '@nestjs/common';
import { ActivityResourceType, UserRole } from '../../generated/prisma/enums';
import type { ActivityQuery } from './activity.types';

export function assertActivityReadScope(
  role: UserRole,
  query: ActivityQuery,
): void {
  if (role === UserRole.ADMIN) return;
  if (
    role !== UserRole.SUPPORT_MANAGER ||
    !query.resourceId ||
    (query.resourceType !== ActivityResourceType.ORDER &&
      query.resourceType !== ActivityResourceType.RETURN_REQUEST)
  ) {
    throw new ForbiddenException(
      'SupportManager activity reads require an Order or ReturnRequest scope',
    );
  }
}
