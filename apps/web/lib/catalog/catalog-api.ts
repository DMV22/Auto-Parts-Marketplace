import { apiRequest } from "@/lib/api/api-client";
import { AppError } from "@/lib/api/app-error";
import {
  type CatalogQueryState,
  serializeCatalogQuery,
} from "./catalog-query";
import {
  catalogFilterOptionsResponseSchema,
  catalogResponseSchema,
  type CatalogFilterOptionsResponse,
  type CatalogResponse,
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

function invalidResponse(resource: string, details: unknown): AppError {
  return new AppError(`The ${resource} response does not match its contract`, {
    kind: "invalid_response",
    details,
  });
}
