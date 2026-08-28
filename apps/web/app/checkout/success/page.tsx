import type { Metadata } from "next";
import { CheckoutReturnPage } from "@/components/checkout/CheckoutReturnPage";

export const metadata: Metadata = {
  title: "Статус оплати | Auto Parts Marketplace",
};

type CheckoutSuccessPageProps = {
  searchParams: Promise<{ orderId?: string | string[] }>;
};

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const parameters = await searchParams;

  return (
    <CheckoutReturnPage
      mode="success"
      rawOrderId={
        typeof parameters.orderId === "string" ? parameters.orderId : undefined
      }
    />
  );
}
