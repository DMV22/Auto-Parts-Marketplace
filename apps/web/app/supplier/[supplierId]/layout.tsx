import type { ReactNode } from "react";
import { SupplierWorkspaceShell } from "@/components/supplier/SupplierWorkspaceShell";

export default async function SupplierLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ supplierId: string }>;
}>) {
  const { supplierId } = await params;
  return (
    <SupplierWorkspaceShell supplierId={supplierId}>
      {children}
    </SupplierWorkspaceShell>
  );
}
