import type { Metadata } from "next";
import { InternalOrdersScreen } from "@/components/internal-ops/InternalOrdersScreen";
import { parseInternalOrdersQuery } from "@/lib/internal-ops/internal-ops-route-query";

export const metadata: Metadata = { title: "Internal Orders | Auto Parts Marketplace" };

export default async function InternalOrdersRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <InternalOrdersScreen query={parseInternalOrdersQuery(await searchParams)} />;
}
