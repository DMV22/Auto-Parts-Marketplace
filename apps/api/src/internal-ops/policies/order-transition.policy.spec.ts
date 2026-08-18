import { ConflictException, ForbiddenException } from '@nestjs/common';
import { OrderStatus, UserRole } from '../../generated/prisma/enums';
import { resolveInternalOrderTransition } from './order-transition.policy';

describe('internal Order transition policy', () => {
  it.each([UserRole.SUPPORT_MANAGER, UserRole.ADMIN])(
    'allows %s to advance the post-payment lifecycle in order',
    (role) => {
      expect(
        resolveInternalOrderTransition(
          OrderStatus.PAID,
          OrderStatus.PROCESSING,
          role,
        ),
      ).toBe(OrderStatus.PROCESSING);
      expect(
        resolveInternalOrderTransition(
          OrderStatus.PROCESSING,
          OrderStatus.SHIPPED,
          role,
        ),
      ).toBe(OrderStatus.SHIPPED);
      expect(
        resolveInternalOrderTransition(
          OrderStatus.SHIPPED,
          OrderStatus.DELIVERED,
          role,
        ),
      ).toBe(OrderStatus.DELIVERED);
    },
  );

  it.each([UserRole.CUSTOMER, UserRole.SUPPLIER_USER])(
    'denies internal Order transitions to %s',
    (role) => {
      expect(() =>
        resolveInternalOrderTransition(
          OrderStatus.PAID,
          OrderStatus.PROCESSING,
          role,
        ),
      ).toThrow(ForbiddenException);
    },
  );

  it('rejects payment-authority, skipped, repeated and terminal transitions', () => {
    expect(() =>
      resolveInternalOrderTransition(
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.PAID,
        UserRole.ADMIN,
      ),
    ).toThrow(ConflictException);
    expect(() =>
      resolveInternalOrderTransition(
        OrderStatus.PAID,
        OrderStatus.SHIPPED,
        UserRole.SUPPORT_MANAGER,
      ),
    ).toThrow(ConflictException);
    expect(() =>
      resolveInternalOrderTransition(
        OrderStatus.PROCESSING,
        OrderStatus.PROCESSING,
        UserRole.ADMIN,
      ),
    ).toThrow(ConflictException);
    expect(() =>
      resolveInternalOrderTransition(
        OrderStatus.DELIVERED,
        OrderStatus.PROCESSING,
        UserRole.ADMIN,
      ),
    ).toThrow(ConflictException);
  });
});
