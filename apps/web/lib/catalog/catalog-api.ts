import { apiRequest } from "@/lib/api/api-client";
import { AppError } from "@/lib/api/app-error";
import {
  type CatalogQueryState,
  serializeCatalogQuery,
} from "./catalog-query";
import {
  catalogFilterOptionsResponseSchema,
  productDetailResponseSchema,
  catalogResponseSchema,
  type CatalogFilterOptionsResponse,
  type CatalogResponse,
  type ProductDetailResponse,
} from "./catalog-types";

export async function getCatalogFilterOptions(
  signal?: AbortSignal,
): Promise<CatalogFilterOptionsResponse> {
  const payload = await apiRequest<unknown>("/api/v1/catalog/filter-options", {
    signal,
  });
  const result = catalogFilterOptionsResponseSchema.safeParse(payload);
  if (!result.success) {
    throw invalidResponse("filter-options", result.error.flatten());
  }
  return result.data;
}

export async function getCatalogProducts(
  state: CatalogQueryState,
  savedVehicleId: string | null,
  signal?: AbortSignal,
): Promise<CatalogResponse> {
  const params = serializeCatalogQuery(state);
  if (savedVehicleId) params.set("savedVehicleId", savedVehicleId);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  const payload = await apiRequest<unknown>(
    `/api/v1/catalog/products${suffix}`,
    { signal },
  );
  const result = catalogResponseSchema.safeParse(payload);
  if (!result.success) {
    throw invalidResponse("catalog", result.error.flatten());
  }
  return result.data;
}

export async function getProductDetail(
  productId: string,
  savedVehicleId: string | null,
  options: { signal?: AbortSignal; baseUrl?: string } = {},
): Promise<ProductDetailResponse> {
  const params = new URLSearchParams();
  if (savedVehicleId) params.set("savedVehicleId", savedVehicleId);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  const payload = await apiRequest<unknown>(
    `/api/v1/catalog/products/${encodeURIComponent(productId)}${suffix}`,
    {
      signal: options.signal,
      baseUrl: options.baseUrl,
      cache: "no-store",
    },
  );
  const result = productDetailResponseSchema.safeParse(payload);
  if (!result.success) {
    throw invalidResponse("product detail", result.error.flatten());
  }
  return result.data;
}

function invalidResponse(resource: string, details: unknown): AppError {
  return new AppError(`The ${resource} response does not match its contract`, {
    kind: "invalid_response",
    details,
  });
}
