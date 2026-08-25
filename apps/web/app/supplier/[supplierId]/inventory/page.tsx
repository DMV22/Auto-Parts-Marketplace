import { SupplierInventoryScreen } from "@/components/supplier/SupplierInventoryScreen";

export default async function SupplierInventoryRoute({
  params,
}: Readonly<{ params: Promise<{ supplierId: string }> }>) {
  const { supplierId } = await params;
  return <SupplierInventoryScreen supplierId={supplierId} />;
}
