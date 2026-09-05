import type { Metadata } from "next";
import { ActivityLogScreen } from "@/components/internal-ops/ActivityLogScreen";
import { parseActivityQuery } from "@/lib/internal-ops/internal-ops-route-query";

export const metadata: Metadata = { title: "ActivityLog | Auto Parts Marketplace" };

export default async function ActivityRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ActivityLogScreen query={parseActivityQuery(await searchParams)} />;
}
