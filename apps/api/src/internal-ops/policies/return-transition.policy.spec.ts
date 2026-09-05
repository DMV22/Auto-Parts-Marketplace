import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ReturnRequestStatus, UserRole } from '../../generated/prisma/enums';
import { resolveReturnTransition } from './return-transition.policy';

describe('ReturnRequest transition policy', () => {
  it.each([UserRole.SUPPORT_MANAGER, UserRole.ADMIN])(
    'allows %s to process the operational lifecycle',
    (role) => {
      expect(
        resolveReturnTransition(
          ReturnRequestStatus.REQUESTED,
          ReturnRequestStatus.UNDER_REVIEW,
          role,
        ),
      ).toBe(ReturnRequestStatus.UNDER_REVIEW);
      expect(
        resolveReturnTransition(
          ReturnRequestStatus.UNDER_REVIEW,
          ReturnRequestStatus.APPROVED,
          role,
        ),
      ).toBe(ReturnRequestStatus.APPROVED);
      expect(
        resolveReturnTransition(
          ReturnRequestStatus.UNDER_REVIEW,
          ReturnRequestStatus.REJECTED,
          role,
        ),
      ).toBe(ReturnRequestStatus.REJECTED);
      expect(
        resolveReturnTransition(
          ReturnRequestStatus.APPROVED,
          ReturnRequestStatus.RECEIVED,
          role,
        ),
      ).toBe(ReturnRequestStatus.RECEIVED);
      expect(
        resolveReturnTransition(
          ReturnRequestStatus.RECEIVED,
          ReturnRequestStatus.COMPLETED,
          role,
        ),
      ).toBe(ReturnRequestStatus.COMPLETED);
    },
  );

  it.each([
    ReturnRequestStatus.REQUESTED,
    ReturnRequestStatus.UNDER_REVIEW,
    ReturnRequestStatus.APPROVED,
  ])('allows Customer to cancel from %s', (current) => {
    expect(
      resolveReturnTransition(
        current,
        ReturnRequestStatus.CANCELLED,
        UserRole.CUSTOMER,
      ),
    ).toBe(ReturnRequestStatus.CANCELLED);
  });

  it('denies SupplierUser and non-cancellation Customer transitions', () => {
    expect(() =>
      resolveReturnTransition(
        ReturnRequestStatus.REQUESTED,
        ReturnRequestStatus.UNDER_REVIEW,
        UserRole.SUPPLIER_USER,
      ),
    ).toThrow(ForbiddenException);
    expect(() =>
      resolveReturnTransition(
        ReturnRequestStatus.REQUESTED,
        ReturnRequestStatus.UNDER_REVIEW,
        UserRole.CUSTOMER,
      ),
    ).toThrow(ForbiddenException);
  });

  it.each([
    ReturnRequestStatus.REJECTED,
    ReturnRequestStatus.COMPLETED,
    ReturnRequestStatus.CANCELLED,
  ])('rejects outgoing transitions from terminal status %s', (current) => {
    expect(() =>
      resolveReturnTransition(
        current,
        ReturnRequestStatus.UNDER_REVIEW,
        UserRole.ADMIN,
      ),
    ).toThrow(ConflictException);
  });

  it('rejects skipped and repeated transitions', () => {
    expect(() =>
      resolveReturnTransition(
        ReturnRequestStatus.REQUESTED,
        ReturnRequestStatus.APPROVED,
        UserRole.SUPPORT_MANAGER,
      ),
    ).toThrow(ConflictException);
    expect(() =>
      resolveReturnTransition(
        ReturnRequestStatus.REQUESTED,
        ReturnRequestStatus.REQUESTED,
        UserRole.ADMIN,
      ),
    ).toThrow(ConflictException);
  });
});
