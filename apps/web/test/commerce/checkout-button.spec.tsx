import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CheckoutButton } from "@/components/checkout/CheckoutButton";
import type { CheckoutSessionView } from "@/lib/commerce/checkout-types";
import { createQueryClient } from "@/lib/query/query-client";

const CHECKOUT: CheckoutSessionView = {
  orderId: "92000000-0000-4000-8000-000000000002",
  status: "PENDING_PAYMENT",
  currency: "UAH",
  totalAmount: "250.00",
  checkoutExpiresAt: "2026-08-21T12:31:00.000Z",
  checkoutSession: {
    id: "cs_test_checkout",
    url: "https://checkout.stripe.test/cs_test_checkout",
  },
};

describe("CheckoutButton", () => {
  it("prevents a double submit while one checkout attempt is pending", async () => {
    let resolveCheckout!: (value: CheckoutSessionView) => void;
    const requestCheckout = vi.fn(
      () =>
        new Promise<CheckoutSessionView>((resolve) => {
          resolveCheckout = resolve;
        }),
    );
    const redirect = vi.fn();

    render(
      <QueryClientProvider client={createQueryClient()}>
        <CheckoutButton
          disabled={false}
          requestCheckout={requestCheckout}
          redirect={redirect}
        />
      </QueryClientProvider>,
    );

    const button = screen.getByRole("button", { name: "Перейти до оплати" });
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(requestCheckout).toHaveBeenCalledTimes(1));
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(requestCheckout).toHaveBeenCalledTimes(1);

    resolveCheckout(CHECKOUT);
    await waitFor(() =>
      expect(redirect).toHaveBeenCalledWith(CHECKOUT.checkoutSession?.url),
    );
  });
});
