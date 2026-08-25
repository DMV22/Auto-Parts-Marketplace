import { SupplierOrderItemDetail } from "@/components/supplier/SupplierOrderItemDetail";

export default async function SupplierOrderItemDetailRoute({
  params,
}: Readonly<{
  params: Promise<{ supplierId: string; orderItemId: string }>;
}>) {
  const { supplierId, orderItemId } = await params;
  return (
    <SupplierOrderItemDetail
      supplierId={supplierId}
      orderItemId={orderItemId}
    />
  );
}
