import { SupplierListingDetail } from "@/components/supplier/SupplierListingDetail";

export default async function SupplierListingDetailRoute({
  params,
}: Readonly<{
  params: Promise<{ supplierId: string; listingId: string }>;
}>) {
  const { supplierId, listingId } = await params;
  return (
    <SupplierListingDetail supplierId={supplierId} listingId={listingId} />
  );
}
