import { SupplierOrderItemsScreen } from "@/components/supplier/SupplierOrderItemsScreen";
import { parseSupplierOrderItemsQuery } from "@/lib/supplier/supplier-route-query";

export default async function SupplierOrderItemsRoute({
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
    <SupplierOrderItemsScreen
      supplierId={supplierId}
      query={parseSupplierOrderItemsQuery(rawSearchParams)}
    />
  );
}
