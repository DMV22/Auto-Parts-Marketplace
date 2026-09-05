import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { SupplierWorkspaceShell } from "@/components/supplier/SupplierWorkspaceShell";
import { getServerApiRequestContext } from "@/lib/api/server-request";
import { createQueryClient } from "@/lib/query/query-client";
import { supplierMembershipQueryOptions } from "@/lib/query/supplier-queries";

export default async function SupplierLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ supplierId: string }>;
}>) {
  const { supplierId } = await params;
  const queryClient = createQueryClient();
  const requestContext = await getServerApiRequestContext();
  await queryClient.prefetchQuery(
    supplierMembershipQueryOptions(requestContext),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SupplierWorkspaceShell supplierId={supplierId}>
        {children}
      </SupplierWorkspaceShell>
    </HydrationBoundary>
  );
}
