import type { Metadata } from "next";
import { CheckoutReturnPage } from "@/components/checkout/CheckoutReturnPage";

export const metadata: Metadata = {
  title: "Checkout скасовано | Auto Parts Marketplace",
};

type CheckoutCancelPageProps = {
  searchParams: Promise<{ orderId?: string | string[] }>;
};

export default async function CheckoutCancelPage({
  searchParams,
}: CheckoutCancelPageProps) {
  const parameters = await searchParams;

  return (
    <CheckoutReturnPage
      mode="cancel"
      rawOrderId={
        typeof parameters.orderId === "string" ? parameters.orderId : undefined
      }
    />
  );
}
