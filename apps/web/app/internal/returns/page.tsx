import type { Metadata } from "next";
import { InternalReturnsScreen } from "@/components/internal-ops/InternalReturnsScreen";
import { parseInternalReturnsQuery } from "@/lib/internal-ops/internal-ops-route-query";

export const metadata: Metadata = { title: "Internal Returns | Auto Parts Marketplace" };

export default async function InternalReturnsRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <InternalReturnsScreen query={parseInternalReturnsQuery(await searchParams)} />;
}
