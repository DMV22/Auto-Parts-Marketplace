import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { SupplierOrderItemDetail } from "@/components/supplier/SupplierOrderItemDetail";
import { SupplierOrderItemsScreen } from "@/components/supplier/SupplierOrderItemsScreen";
import { createQueryClient } from "@/lib/query/query-client";
import { mockApi } from "../mocks/server";

const SUPPLIER_ID = "11111111-1111-4111-8111-111111111111";
const ITEM_ID = "22222222-2222-4222-8222-222222222222";
const SUPPLIER_ORDER_ITEM = {
  id: ITEM_ID,
  orderId: "33333333-3333-4333-8333-333333333333",
  listingId: "44444444-4444-4444-8444-444444444444",
  productName: "Гальмівні колодки",
  sku: "BRAKE-1",
  manufacturerPartNumber: "MPN-1",
  condition: "NEW",
  quantity: 2,
  unitPrice: "100.00",
  lineTotal: "200.00",
  currency: "UAH",
  orderStatus: "PAID",
  orderedAt: "2026-08-24T10:00:00.000Z",
  orderUpdatedAt: "2026-08-24T10:05:00.000Z",
} as const;

describe("Supplier OrderItem presentation", () => {
  it("renders only the supplier-safe immutable projection", async () => {
    mockApi.use(
      http.get(
        "*/api/v1/suppliers/:supplierId/order-items/:orderItemId",
        () =>
          HttpResponse.json(SUPPLIER_ORDER_ITEM),
      ),
    );
    render(
      <QueryClientProvider client={createQueryClient()}>
        <SupplierOrderItemDetail
          supplierId={SUPPLIER_ID}
          orderItemId={ITEM_ID}
        />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Гальмівні колодки")).toBeVisible();
    expect(screen.getByText("BRAKE-1")).toBeVisible();
    expect(screen.queryByText("customer@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText(/PaymentEvent/)).not.toBeInTheDocument();
  });

  it("gives the supplier order-items table an accessible name", async () => {
    mockApi.use(
      http.get("*/api/v1/suppliers/:supplierId/order-items", () =>
        HttpResponse.json({
          data: [SUPPLIER_ORDER_ITEM],
          meta: { pageSize: 20, nextCursor: null, hasNextPage: false },
        }),
      ),
    );
    render(
      <QueryClientProvider client={createQueryClient()}>
        <SupplierOrderItemsScreen supplierId={SUPPLIER_ID} query={{}} />
      </QueryClientProvider>,
    );

    const table = await screen.findByRole("table", {
      name: "Позиції замовлень поточного постачальника",
    });
    expect(table).toBeVisible();
    expect(within(table).getByText("Оплачено")).toBeVisible();
  });
});
