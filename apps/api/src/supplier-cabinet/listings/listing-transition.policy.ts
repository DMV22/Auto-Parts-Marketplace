import { ConflictException, ForbiddenException } from '@nestjs/common';
import {
  ListingStatus,
  type ListingStatus as ListingStatusValue,
  UserRole,
  type UserRole as UserRoleValue,
} from '../../generated/prisma/enums';
import type {
  AdminListingAction,
  ListingModerationAction,
  SupplierListingAction,
  UpdateSupplierListing,
} from './listings.types';

export function resolveSupplierListingTransition(
  current: ListingStatusValue,
  action: SupplierListingAction,
): ListingStatusValue {
  if (action === 'archive') {
    if (current === ListingStatus.ARCHIVED) invalidTransition(current, action);
    return ListingStatus.ARCHIVED;
  }
  if (
    action === 'submit' &&
    (current === ListingStatus.DRAFT || current === ListingStatus.REJECTED)
  ) {
    return ListingStatus.PENDING_APPROVAL;
  }
  if (action === 'pause' && current === ListingStatus.ACTIVE) {
    return ListingStatus.PAUSED;
  }
  if (action === 'resume' && current === ListingStatus.PAUSED) {
    return ListingStatus.ACTIVE;
  }
  return invalidTransition(current, action);
}

export function resolveAdminListingTransition(
  current: ListingStatusValue,
  action: AdminListingAction,
): ListingStatusValue {
  return resolveListingModerationTransition(current, action, UserRole.ADMIN);
}

export function resolveListingModerationTransition(
  current: ListingStatusValue,
  action: ListingModerationAction,
  role: UserRoleValue,
): ListingStatusValue {
  if (role !== UserRole.ADMIN) {
    throw new ForbiddenException('Only Admin can moderate Listings');
  }
  if (current === ListingStatus.PENDING_APPROVAL) {
    if (action === 'approve') return ListingStatus.ACTIVE;
    if (action === 'reject') return ListingStatus.REJECTED;
  }
  if (current === ListingStatus.ACTIVE && action === 'pause') {
    return ListingStatus.PAUSED;
  }
  return invalidTransition(current, action);
}

export function resolveSupplierListingUpdate(
  current: ListingStatusValue,
  command: UpdateSupplierListing,
): ListingStatusValue {
  if (current === ListingStatus.PENDING_APPROVAL) {
    throw new ConflictException('A pending listing cannot be edited');
  }
  if (current === ListingStatus.ARCHIVED) {
    throw new ConflictException('An archived listing cannot be edited');
  }
  if (
    (current === ListingStatus.ACTIVE || current === ListingStatus.PAUSED) &&
    ('productVariantId' in command ||
      'condition' in command ||
      'currency' in command)
  ) {
    return ListingStatus.PENDING_APPROVAL;
  }
  return current;
}

function invalidTransition(current: ListingStatusValue, action: string): never {
  throw new ConflictException(
    `Listing cannot transition from ${current} through ${action}`,
  );
}
