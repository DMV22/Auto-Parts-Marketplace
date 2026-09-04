"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { supplierMembershipQueryOptions } from "@/lib/query/supplier-queries";

export function SupplierWorkspaceLink({
  className,
}: Readonly<{ className?: string }>) {
  const membership = useQuery(supplierMembershipQueryOptions());
  if (
    membership.isPending ||
    membership.isError ||
    membership.data.data?.status !== "ACTIVE"
  ) {
    return null;
  }
  return (
    <Link
      className={className}
      href={`/supplier/${membership.data.data.supplier.id}/listings`}
    >
      Кабінет постачальника
    </Link>
  );
}
