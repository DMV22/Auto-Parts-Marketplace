import type { Metadata } from "next";
import { AdminModerationScreen } from "@/components/internal-ops/AdminModerationScreen";
import { AdminAccessBoundary } from "@/components/internal-ops/InternalWorkspaceShell";
import { parseModerationQuery } from "@/lib/internal-ops/internal-ops-route-query";

export const metadata: Metadata = { title: "Listing Moderation | Auto Parts Marketplace" };

export default async function AdminModerationRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AdminAccessBoundary>
      <AdminModerationScreen query={parseModerationQuery(await searchParams)} />
    </AdminAccessBoundary>
  );
}
