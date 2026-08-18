import { ConflictException } from '@nestjs/common';
import { ListingStatus } from '../../generated/prisma/enums';
import {
  resolveAdminListingTransition,
  resolveSupplierListingTransition,
  resolveSupplierListingUpdate,
} from './listing-transition.policy';

describe('listing transition policy', () => {
  it.each([
    [ListingStatus.DRAFT, 'submit', ListingStatus.PENDING_APPROVAL],
    [ListingStatus.REJECTED, 'submit', ListingStatus.PENDING_APPROVAL],
    [ListingStatus.ACTIVE, 'pause', ListingStatus.PAUSED],
    [ListingStatus.PAUSED, 'resume', ListingStatus.ACTIVE],
    [ListingStatus.PENDING_APPROVAL, 'archive', ListingStatus.ARCHIVED],
  ] as const)(
    'allows supplier transition %s -> %s -> %s',
    (current, action, expected) => {
      expect(resolveSupplierListingTransition(current, action)).toBe(expected);
    },
  );

  it.each([
    [ListingStatus.PENDING_APPROVAL, 'approve', ListingStatus.ACTIVE],
    [ListingStatus.PENDING_APPROVAL, 'reject', ListingStatus.REJECTED],
  ] as const)(
    'allows Admin transition %s -> %s -> %s',
    (current, action, expected) => {
      expect(resolveAdminListingTransition(current, action)).toBe(expected);
    },
  );

  it('rejects invalid, repeated and terminal transitions', () => {
    expect(() =>
      resolveSupplierListingTransition(ListingStatus.DRAFT, 'pause'),
    ).toThrow(ConflictException);
    expect(() =>
      resolveSupplierListingTransition(ListingStatus.ARCHIVED, 'archive'),
    ).toThrow(ConflictException);
    expect(() =>
      resolveAdminListingTransition(ListingStatus.ACTIVE, 'approve'),
    ).toThrow(ConflictException);
  });

  it('preserves publication for price-only edits and invalidates material edits', () => {
    expect(
      resolveSupplierListingUpdate(ListingStatus.ACTIVE, { price: '10.00' }),
    ).toBe(ListingStatus.ACTIVE);
    expect(
      resolveSupplierListingUpdate(ListingStatus.PAUSED, {
        condition: 'USED',
        price: '10.00',
      }),
    ).toBe(ListingStatus.PENDING_APPROVAL);
    expect(
      resolveSupplierListingUpdate(ListingStatus.REJECTED, {
        currency: 'USD',
      }),
    ).toBe(ListingStatus.REJECTED);
  });

  it('rejects edits while pending approval or archived', () => {
    expect(() =>
      resolveSupplierListingUpdate(ListingStatus.PENDING_APPROVAL, {
        price: '10.00',
      }),
    ).toThrow(ConflictException);
    expect(() =>
      resolveSupplierListingUpdate(ListingStatus.ARCHIVED, { price: '10.00' }),
    ).toThrow(ConflictException);
  });
});
