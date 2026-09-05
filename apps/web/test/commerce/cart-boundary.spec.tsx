import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { CartBoundary } from "@/components/cart/CartBoundary";
import { createQueryClient } from "@/lib/query/query-client";
import { mockApi } from "../mocks/server";

const cartItem = {
  id: "91000000-0000-4000-8000-000000000001",
  quantity: 1,
  unitPrice: "125.00",
  lineTotal: "125.00",
  available: true,
  issues: [],
  listing: {
    id: "91000000-0000-4000-8000-000000000002",
    condition: "NEW",
    currency: "UAH",
    inStock: true,
    productVariant: {
      id: "91000000-0000-4000-8000-000000000003",
      sku: "PAD-001",
      product: {
        id: "91000000-0000-4000-8000-000000000004",
        name: "Brake pads",
      },
    },
    supplier: {
      id: "91000000-0000-4000-8000-000000000005",
      name: "Parts Supplier",
      slug: "parts-supplier",
    },
  },
};

describe("CartBoundary", () => {
  it("clears the cart only after explicit confirmation", async () => {
    let clearRequests = 0;
    mockApi.use(
      http.get("*/api/auth/get-session", () => HttpResponse.json(null)),
      http.get("*/api/v1/cart", () =>
        HttpResponse.json({
          data: {
            id: "91000000-0000-4000-8000-000000000010",
            currency: "UAH",
            totalQuantity: 1,
            totalAmount: "125.00",
            items: [cartItem],
          },
        }),
      ),
      http.delete("*/api/v1/cart", () => {
        clearRequests += 1;
        return HttpResponse.json({
          data: {
            id: null,
            currency: null,
            totalQuantity: 0,
            totalAmount: "0.00",
            items: [],
          },
        });
      }),
    );

    render(
      <QueryClientProvider client={createQueryClient()}>
        <CartBoundary />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Brake pads")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Очистити кошик" }));

    expect(clearRequests).toBe(0);
    expect(screen.getByText("Очистити весь кошик?")).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Підтвердити очищення" }),
    );

    await waitFor(() => expect(clearRequests).toBe(1));
    expect(await screen.findByText("Кошик порожній")).toBeVisible();
  });
});
