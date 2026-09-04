import { queryOptions } from "@tanstack/react-query";
import {
  getCurrentSupplierMembership,
  getSupplierListing,
  getSupplierListings,
  getSupplierOrderItem,
  getSupplierOrderItems,
  getSupplierProductVariant,
  getSupplierProductVariants,
} from "@/lib/supplier/supplier-api";
import type {
  SupplierListingsQuery,
  SupplierOrderItemsQuery,
} from "@/lib/supplier/supplier-types";
import { queryKeys } from "./query-keys";

function stableQuery(values: object): string {
  return JSON.stringify(values);
}

export function supplierMembershipQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.supplier.membership,
    queryFn: ({ signal }) => getCurrentSupplierMembership(signal),
    retry: false,
    staleTime: 30_000,
  });
}

export function supplierProductVariantsQueryOptions(
  supplierId: string,
  query: string,
  cursor: string | null = null,
) {
  return queryOptions({
    queryKey: queryKeys.supplier.variants(supplierId, query, cursor),
    queryFn: ({ signal }) =>
      getSupplierProductVariants(
        supplierId,
        { q: query || undefined, cursor: cursor ?? undefined, limit: 20 },
        signal,
      ),
    enabled: query.length > 1,
    retry: false,
    staleTime: 30_000,
  });
}

export function supplierProductVariantQueryOptions(
  supplierId: string,
  variantId: string,
) {
  return queryOptions({
    queryKey: queryKeys.supplier.variant(supplierId, variantId),
    queryFn: ({ signal }) =>
      getSupplierProductVariant(supplierId, variantId, signal),
    enabled: variantId.length > 0,
    retry: false,
    staleTime: 30_000,
  });
}

export function supplierListingsQueryOptions(
  supplierId: string,
  query: SupplierListingsQuery,
) {
  return queryOptions({
    queryKey: queryKeys.supplier.listings(supplierId, stableQuery(query)),
    queryFn: ({ signal }) => getSupplierListings(supplierId, query, signal),
    retry: false,
    staleTime: 10_000,
  });
}

export function supplierListingQueryOptions(
  supplierId: string,
  listingId: string,
) {
  return queryOptions({
    queryKey: queryKeys.supplier.listing(supplierId, listingId),
    queryFn: ({ signal }) => getSupplierListing(supplierId, listingId, signal),
    retry: false,
  });
}

export function supplierOrderItemsQueryOptions(
  supplierId: string,
  query: SupplierOrderItemsQuery,
) {
  return queryOptions({
    queryKey: queryKeys.supplier.orderItems(supplierId, stableQuery(query)),
    queryFn: ({ signal }) => getSupplierOrderItems(supplierId, query, signal),
    retry: false,
    staleTime: 10_000,
  });
}

export function supplierOrderItemQueryOptions(
  supplierId: string,
  orderItemId: string,
) {
  return queryOptions({
    queryKey: queryKeys.supplier.orderItem(supplierId, orderItemId),
    queryFn: ({ signal }) =>
      getSupplierOrderItem(supplierId, orderItemId, signal),
    retry: false,
  });
}
