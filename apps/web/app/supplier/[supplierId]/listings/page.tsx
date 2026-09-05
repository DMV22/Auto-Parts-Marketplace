import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { SupplierListingsScreen } from "@/components/supplier/SupplierListingsScreen";
import { getServerApiRequestContext } from "@/lib/api/server-request";
import { createQueryClient } from "@/lib/query/query-client";
import { supplierListingsQueryOptions } from "@/lib/query/supplier-queries";
import { parseSupplierListingsQuery } from "@/lib/supplier/supplier-route-query";

export default async function SupplierListingsRoute({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ supplierId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const [{ supplierId }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const query = parseSupplierListingsQuery(rawSearchParams);
  const queryClient = createQueryClient();
  const requestContext = await getServerApiRequestContext();
  await queryClient.prefetchQuery(
    supplierListingsQueryOptions(supplierId, query, requestContext),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SupplierListingsScreen supplierId={supplierId} query={query} />
    </HydrationBoundary>
  );
}
