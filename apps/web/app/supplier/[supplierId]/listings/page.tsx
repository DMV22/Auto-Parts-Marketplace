import { SupplierListingsScreen } from "@/components/supplier/SupplierListingsScreen";
import { parseSupplierListingsQuery } from "@/lib/supplier/supplier-route-query";

export default async function SupplierListingsRoute({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ supplierId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const [{ supplierId }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  return (
    <SupplierListingsScreen
      supplierId={supplierId}
      query={parseSupplierListingsQuery(rawSearchParams)}
    />
  );
}
