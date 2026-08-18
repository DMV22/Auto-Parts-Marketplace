import { ConflictException, ForbiddenException } from '@nestjs/common';
import {
  ReturnRequestStatus,
  type ReturnRequestStatus as ReturnRequestStatusValue,
  UserRole,
  type UserRole as UserRoleValue,
} from '../../generated/prisma/enums';

const operationalTransitions = new Map<
  ReturnRequestStatusValue,
  ReadonlySet<ReturnRequestStatusValue>
>([
  [ReturnRequestStatus.REQUESTED, new Set([ReturnRequestStatus.UNDER_REVIEW])],
  [
    ReturnRequestStatus.UNDER_REVIEW,
    new Set([ReturnRequestStatus.APPROVED, ReturnRequestStatus.REJECTED]),
  ],
  [ReturnRequestStatus.APPROVED, new Set([ReturnRequestStatus.RECEIVED])],
  [ReturnRequestStatus.RECEIVED, new Set([ReturnRequestStatus.COMPLETED])],
]);

const customerCancellableStatuses = new Set<ReturnRequestStatusValue>([
  ReturnRequestStatus.REQUESTED,
  ReturnRequestStatus.UNDER_REVIEW,
  ReturnRequestStatus.APPROVED,
]);

export function resolveReturnTransition(
  current: ReturnRequestStatusValue,
  target: ReturnRequestStatusValue,
  role: UserRoleValue,
): ReturnRequestStatusValue {
  if (role === UserRole.CUSTOMER) {
    if (
      target === ReturnRequestStatus.CANCELLED &&
      customerCancellableStatuses.has(current)
    ) {
      return target;
    }
    throw new ForbiddenException(
      'Customer can only cancel an eligible ReturnRequest',
    );
  }

  if (role !== UserRole.SUPPORT_MANAGER && role !== UserRole.ADMIN) {
    throw new ForbiddenException(
      'The current role cannot transition ReturnRequests',
    );
  }

  if (!operationalTransitions.get(current)?.has(target)) {
    throw new ConflictException(
      `ReturnRequest cannot transition from ${current} to ${target}`,
    );
  }

  return target;
}
