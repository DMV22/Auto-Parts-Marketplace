import { dehydrate, type DehydratedState } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query/query-client";
import { queryKeys } from "@/lib/query/query-keys";
import { getProductDetail } from "./catalog-api";

const apiInternalUrl = (
  process.env.API_INTERNAL_URL ?? "http://localhost:3001"
).replace(/\/+$/, "");

new URL(apiInternalUrl);

export async function createProductDetailHydrationState(
  productId: string,
): Promise<DehydratedState> {
  const queryClient = createQueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.catalog.productDetail(productId, null),
    queryFn: () =>
      getProductDetail(productId, null, { baseUrl: apiInternalUrl }),
  });

  return dehydrate(queryClient);
}
