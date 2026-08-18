import { queryOptions } from "@tanstack/react-query";
import {
  getCatalogFilterOptions,
  getCatalogProducts,
  getProductDetail,
} from "@/lib/catalog/catalog-api";
import {
  type CatalogQueryState,
  serializeCatalogQuery,
} from "@/lib/catalog/catalog-query";
import { queryKeys } from "./query-keys";

export function catalogFilterOptionsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.catalog.filterOptions,
    queryFn: ({ signal }) => getCatalogFilterOptions(signal),
  });
}

export function productDetailQueryOptions(
  productId: string,
  savedVehicleId: string | null,
) {
  return queryOptions({
    queryKey: queryKeys.catalog.productDetail(productId, savedVehicleId),
    queryFn: ({ signal }) =>
      getProductDetail(productId, savedVehicleId, { signal }),
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[2] === productId ? previousData : undefined,
  });
}

export function catalogProductsQueryOptions(
  state: CatalogQueryState,
  savedVehicleId: string | null,
) {
  const serialized = serializeCatalogQuery(state).toString();
  return queryOptions({
    queryKey: queryKeys.catalog.products(serialized, savedVehicleId),
    queryFn: ({ signal }) => getCatalogProducts(state, savedVehicleId, signal),
  });
}
