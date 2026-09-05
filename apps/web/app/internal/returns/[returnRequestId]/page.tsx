import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { InternalReturnDetailScreen } from "@/components/internal-ops/InternalReturnDetailScreen";

export const metadata: Metadata = { title: "Internal Return | Auto Parts Marketplace" };

export default async function InternalReturnRoute({
  params,
}: {
  params: Promise<{ returnRequestId: string }>;
}) {
  const { returnRequestId } = await params;
  if (!z.uuid().safeParse(returnRequestId).success) notFound();
  return <InternalReturnDetailScreen returnRequestId={returnRequestId} />;
}
