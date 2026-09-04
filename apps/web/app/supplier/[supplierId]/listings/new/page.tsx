import { NewSupplierListingScreen } from "@/components/supplier/NewSupplierListingScreen";

export default async function NewSupplierListingRoute({
  params,
}: Readonly<{ params: Promise<{ supplierId: string }> }>) {
  const { supplierId } = await params;
  return <NewSupplierListingScreen supplierId={supplierId} />;
}
