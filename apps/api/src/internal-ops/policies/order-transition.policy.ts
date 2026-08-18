import { ConflictException, ForbiddenException } from '@nestjs/common';
import {
  OrderStatus,
  type OrderStatus as OrderStatusValue,
  UserRole,
  type UserRole as UserRoleValue,
} from '../../generated/prisma/enums';

const allowedTransitions = new Map<OrderStatusValue, OrderStatusValue>([
  [OrderStatus.PAID, OrderStatus.PROCESSING],
  [OrderStatus.PROCESSING, OrderStatus.SHIPPED],
  [OrderStatus.SHIPPED, OrderStatus.DELIVERED],
]);

export function resolveInternalOrderTransition(
  current: OrderStatusValue,
  target: OrderStatusValue,
  role: UserRoleValue,
): OrderStatusValue {
  if (role !== UserRole.SUPPORT_MANAGER && role !== UserRole.ADMIN) {
    throw new ForbiddenException(
      'The current role cannot transition internal Orders',
    );
  }

  if (allowedTransitions.get(current) !== target) {
    throw new ConflictException(
      `Order cannot transition from ${current} to ${target}`,
    );
  }

  return target;
}
