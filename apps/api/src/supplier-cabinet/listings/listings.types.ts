import type {
  ListingCondition,
  ListingStatus,
} from '../../generated/prisma/enums';

export type SupplierListingSort =
  | 'updated_desc'
  | 'updated_asc'
  | 'price_asc'
  | 'price_desc';
export type SupplierListingCursor = {
  version: 1;
  sort: SupplierListingSort;
  value: string;
  id: string;
};
export type SupplierListingsQuery = {
  status: ListingStatus | null;
  condition: ListingCondition | null;
  productVariantId: string | null;
  cursor: SupplierListingCursor | null;
  pageSize: number;
  sort: SupplierListingSort;
};
export type CreateSupplierListing = {
  productVariantId: string;
  condition: ListingCondition;
  price: string;
  currency: string;
};
export type UpdateSupplierListing = Partial<CreateSupplierListing>;
export type SupplierListingAction = 'submit' | 'pause' | 'resume' | 'archive';
export type AdminListingAction = 'approve' | 'reject';
export type RejectSupplierListing = { reason: string };
export type SupplierListingDto = {
  id: string;
  supplierId: string;
  status: ListingStatus;
  condition: ListingCondition;
  price: string;
  currency: string;
  stockQuantity: number;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  productVariant: {
    id: string;
    sku: string;
    manufacturerPartNumber: string;
    oemNumber: string | null;
  };
};
export type SupplierListingsResponse = {
  data: SupplierListingDto[];
  meta: {
    pageSize: number;
    nextCursor: string | null;
    sort: SupplierListingSort;
  };
};
