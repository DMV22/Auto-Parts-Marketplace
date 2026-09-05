import { apiRequest } from "@/lib/api/api-client";
import type { ApiRequestContext } from "@/lib/api/api-client";
import { AppError } from "@/lib/api/app-error";
import {
  supplierListingSchema,
  supplierListingsResponseSchema,
  supplierMembershipResponseSchema,
  supplierOrderItemSchema,
  supplierOrderItemsResponseSchema,
  supplierProductVariantDetailResponseSchema,
  supplierProductVariantsResponseSchema,
  type SupplierListingAction,
  type SupplierListingInput,
  type SupplierListingsQuery,
  type SupplierOrderItemsQuery,
} from "./supplier-types";

function parse<T>(schema: { safeParse: (payload: unknown) => { success: boolean; data?: T; error?: unknown } }, payload: unknown, label: string): T {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new AppError(`${label} response does not match its contract`, {
      kind: "invalid_response",
      details: result.error,
    });
  }
  return result.data as T;
}

function supplierPath(supplierId: string, suffix: string): string {
  return `/api/v1/suppliers/${encodeURIComponent(supplierId)}${suffix}`;
}

function appendQuery(
  path: string,
  values: Record<string, string | number | undefined>,
): string {
  const search = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined) search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export async function getCurrentSupplierMembership(
  signal?: AbortSignal,
  requestContext: ApiRequestContext = {},
) {
  const payload = await apiRequest<unknown>("/api/v1/me/supplier-membership", {
    ...requestContext,
    signal,
  });
  return parse(supplierMembershipResponseSchema, payload, "Supplier membership");
}

export async function getSupplierProductVariants(
  supplierId: string,
  query: { q?: string; cursor?: string; limit?: number },
  signal?: AbortSignal,
) {
  const payload = await apiRequest<unknown>(
    appendQuery(supplierPath(supplierId, "/product-variants"), query),
    { signal },
  );
  return parse(
    supplierProductVariantsResponseSchema,
    payload,
    "Product variants",
  );
}

export async function getSupplierProductVariant(
  supplierId: string,
  productVariantId: string,
  signal?: AbortSignal,
) {
  const payload = await apiRequest<unknown>(
    supplierPath(
      supplierId,
      `/product-variants/${encodeURIComponent(productVariantId)}`,
    ),
    { signal },
  );
  return parse(
    supplierProductVariantDetailResponseSchema,
    payload,
    "Product variant",
  );
}

export async function getSupplierListings(
  supplierId: string,
  query: SupplierListingsQuery,
  signal?: AbortSignal,
  requestContext: ApiRequestContext = {},
) {
  const payload = await apiRequest<unknown>(
    appendQuery(supplierPath(supplierId, "/listings"), query),
    { ...requestContext, signal },
  );
  return parse(supplierListingsResponseSchema, payload, "Supplier listings");
}

export async function getSupplierListing(
  supplierId: string,
  listingId: string,
  signal?: AbortSignal,
) {
  const payload = await apiRequest<unknown>(
    supplierPath(supplierId, `/listings/${encodeURIComponent(listingId)}`),
    { signal },
  );
  return parse(supplierListingSchema, payload, "Supplier listing");
}

export async function createSupplierListing(
  supplierId: string,
  input: SupplierListingInput,
) {
  const payload = await apiRequest<unknown>(
    supplierPath(supplierId, "/listings"),
    { method: "POST", body: input },
  );
  return parse(supplierListingSchema, payload, "Supplier listing");
}

export async function updateSupplierListing(
  supplierId: string,
  listingId: string,
  input: Partial<SupplierListingInput>,
) {
  const payload = await apiRequest<unknown>(
    supplierPath(supplierId, `/listings/${encodeURIComponent(listingId)}`),
    { method: "PATCH", body: input },
  );
  return parse(supplierListingSchema, payload, "Supplier listing");
}

export async function transitionSupplierListing(
  supplierId: string,
  listingId: string,
  action: SupplierListingAction,
) {
  const payload = await apiRequest<unknown>(
    supplierPath(
      supplierId,
      `/listings/${encodeURIComponent(listingId)}/${action}`,
    ),
    { method: "POST" },
  );
  return parse(supplierListingSchema, payload, "Supplier listing");
}

export async function updateSupplierStock(
  supplierId: string,
  listingId: string,
  input: { quantity: number; expectedVersion: number },
) {
  const payload = await apiRequest<unknown>(
    supplierPath(
      supplierId,
      `/listings/${encodeURIComponent(listingId)}/stock`,
    ),
    { method: "PUT", body: input },
  );
  return parse(supplierListingSchema, payload, "Supplier listing");
}

export async function getSupplierOrderItems(
  supplierId: string,
  query: SupplierOrderItemsQuery,
  signal?: AbortSignal,
) {
  const payload = await apiRequest<unknown>(
    appendQuery(supplierPath(supplierId, "/order-items"), query),
    { signal },
  );
  return parse(supplierOrderItemsResponseSchema, payload, "Supplier order items");
}

export async function getSupplierOrderItem(
  supplierId: string,
  orderItemId: string,
  signal?: AbortSignal,
) {
  const payload = await apiRequest<unknown>(
    supplierPath(
      supplierId,
      `/order-items/${encodeURIComponent(orderItemId)}`,
    ),
    { signal },
  );
  return parse(supplierOrderItemSchema, payload, "Supplier order item");
}
