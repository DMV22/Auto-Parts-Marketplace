import type { Metadata } from "next";
import { OrdersPage } from "@/components/orders/OrdersPage";

export const metadata: Metadata = {
  title: "Мої замовлення | Auto Parts Marketplace",
};

export default function OrdersRoute() {
  return <OrdersPage />;
}
