import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { InternalOrdersScreen } from "@/components/internal-ops/InternalOrdersScreen";
import { getServerApiRequestContext } from "@/lib/api/server-request";
import { parseInternalOrdersQuery } from "@/lib/internal-ops/internal-ops-route-query";
import { internalOrdersQueryOptions } from "@/lib/query/internal-ops-queries";
import { createQueryClient } from "@/lib/query/query-client";

export const metadata: Metadata = { title: "Internal Orders | Auto Parts Marketplace" };

export default async function InternalOrdersRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseInternalOrdersQuery(await searchParams);
  const queryClient = createQueryClient();
  const requestContext = await getServerApiRequestContext();
  await queryClient.prefetchQuery(internalOrdersQueryOptions(query, requestContext));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InternalOrdersScreen query={query} />
    </HydrationBoundary>
  );
}
