import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { InternalOrderDetailScreen } from "@/components/internal-ops/InternalOrderDetailScreen";

export const metadata: Metadata = { title: "Internal Order | Auto Parts Marketplace" };

export default async function InternalOrderRoute({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ orderId }, query] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(orderId).success) notFound();
  const rawCursor = query.timelineCursor;
  const timelineCursor =
    typeof rawCursor === "string" && rawCursor.length <= 1024 ? rawCursor : null;
  return <InternalOrderDetailScreen orderId={orderId} timelineCursor={timelineCursor} />;
}
