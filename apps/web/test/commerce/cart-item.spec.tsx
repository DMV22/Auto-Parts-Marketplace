import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CartItem } from "@/components/cart/CartItem";
import type { CartItemView } from "@/lib/commerce/cart-types";

const ITEM: CartItemView = {
  id: "91000000-0000-4000-8000-000000000001",
  quantity: 2,
  unitPrice: "125.00",
  lineTotal: "250.00",
  available: false,
  issues: ["INSUFFICIENT_STOCK"],
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

describe("CartItem", () => {
  it("announces server issues and disables mutations while an update is pending", () => {
    render(
      <CartItem
        item={ITEM}
        pending
        mutationError="Не вдалося оновити кількість."
        onQuantityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText("Недостатньо товару в наявності")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Не вдалося оновити кількість.",
    );
    expect(
      screen.getByRole("button", { name: "Зменшити кількість Brake pads" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Видалити Brake pads з кошика" }),
    ).toBeDisabled();
  });
});
