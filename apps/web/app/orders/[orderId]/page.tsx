import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { OrderDetailPage } from "@/components/orders/OrderDetailPage";

export const metadata: Metadata = {
  title: "Деталі замовлення | Auto Parts Marketplace",
};

type OrderDetailRouteProps = {
  params: Promise<{ orderId: string }>;
};

export default async function OrderDetailRoute({
  params,
}: OrderDetailRouteProps) {
  const { orderId } = await params;
  if (!z.uuid().safeParse(orderId).success) notFound();
  return <OrderDetailPage orderId={orderId} />;
}
