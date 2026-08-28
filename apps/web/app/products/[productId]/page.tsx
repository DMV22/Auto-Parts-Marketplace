import type { Metadata } from "next";
import { HydrationBoundary } from "@tanstack/react-query";
import { ProductDetailPage } from "@/components/catalog/ProductDetailPage";
import { createProductDetailHydrationState } from "@/lib/catalog/server-product-detail";

export const metadata: Metadata = {
  title: "Товар | Auto Parts Marketplace",
  description: "Деталі товару, пропозиції постачальників і перевірка сумісності.",
};

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ productId: string }> }>) {
  const { productId } = await params;
  const productState = await createProductDetailHydrationState(productId);
  return (
    <HydrationBoundary state={productState}>
      <ProductDetailPage productId={productId} />
    </HydrationBoundary>
  );
}
