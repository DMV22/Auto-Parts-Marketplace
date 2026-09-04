import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { createQueryClient } from "@/lib/query/query-client";
import { mockApi } from "../mocks/server";

describe("AddToCartButton", () => {
  it("explains a currency mismatch before sending the cart mutation", async () => {
    let addRequests = 0;
    mockApi.use(
      http.get("*/api/auth/get-session", () => HttpResponse.json(null)),
      http.get("*/api/v1/cart", () =>
        HttpResponse.json({
          data: {
            id: "93000000-0000-4000-8000-000000000001",
            currency: "UAH",
            totalQuantity: 1,
            totalAmount: "125.00",
            items: [],
          },
        }),
      ),
      http.post("*/api/v1/cart/items", () => {
        addRequests += 1;
        return new HttpResponse(null, { status: 409 });
      }),
    );

    render(
      <QueryClientProvider client={createQueryClient()}>
        <AddToCartButton
          listingId="93000000-0000-4000-8000-000000000002"
          currency="EUR"
          inStock
        />
      </QueryClientProvider>,
    );

    const addButton = screen.getByRole("button", { name: "Додати в кошик" });
    await waitFor(() => expect(addButton).toBeEnabled());
    fireEvent.click(addButton);

    expect(addRequests).toBe(0);
    expect(
      screen.getByRole("alert"),
    ).toHaveTextContent(
      "У кошику вже є товари в UAH. Щоб додати пропозицію в EUR, спочатку очистіть кошик.",
    );
    expect(screen.getByRole("link", { name: "Перейти до кошика" })).toHaveAttribute(
      "href",
      "/cart",
    );
  });
});
