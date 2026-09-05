import { QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { InventoryEditor } from "@/components/supplier/SupplierInventoryScreen";
import { createQueryClient } from "@/lib/query/query-client";
import type { SupplierListing } from "@/lib/supplier/supplier-types";
import { mockApi } from "../mocks/server";

const listing: SupplierListing = {
  id: "11111111-1111-4111-8111-111111111111",
  supplierId: "22222222-2222-4222-8222-222222222222",
  status: "ACTIVE",
  condition: "NEW",
  price: "100",
  currency: "UAH",
  stockQuantity: 4,
  inventoryVersion: 3,
  rejectionReason: null,
  moderationReason: null,
  createdAt: "2026-08-24T10:00:00.000Z",
  updatedAt: "2026-08-24T10:00:00.000Z",
  productVariant: {
    id: "33333333-3333-4333-8333-333333333333",
    sku: "SKU-1",
    manufacturerPartNumber: "MPN-1",
    oemNumber: null,
  },
};

describe("InventoryEditor", () => {
  it("shows refetch/retry guidance after an optimistic concurrency conflict", async () => {
    const submittedBodies: unknown[] = [];
    mockApi.use(
      http.put(
        "*/api/v1/suppliers/:supplierId/listings/:listingId/stock",
        async ({ request }) => {
          submittedBodies.push(await request.json());
          if (submittedBodies.length === 1) {
            return HttpResponse.json(
              { message: "Listing inventory changed; refetch before retrying" },
              { status: 409 },
            );
          }
          return HttpResponse.json({
            ...listing,
            stockQuantity: 8,
            inventoryVersion: 5,
          });
        },
      ),
    );

    const queryClient = createQueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const view = render(
      <QueryClientProvider client={queryClient}>
        <InventoryEditor supplierId={listing.supplierId} listing={listing} />
      </QueryClientProvider>,
    );
    fireEvent.change(screen.getByLabelText("Нова кількість"), {
      target: { value: "8" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Зберегти" }));

    const conflict = await screen.findByRole("alert");
    expect(within(conflict).getByText("Залишок уже змінився")).toBeVisible();
    expect(submittedBodies[0]).toEqual({ quantity: 8, expectedVersion: 3 });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["supplier", listing.supplierId, "listing", listing.id],
    });
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <InventoryEditor
          supplierId={listing.supplierId}
          listing={{ ...listing, stockQuantity: 5, inventoryVersion: 4 }}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByLabelText("Нова кількість")).toHaveValue("8");
    expect(screen.getByText(/Актуальний залишок: 5 · Версія: 4/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Повторити" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Повторити" }));
    await waitFor(() =>
      expect(submittedBodies[1]).toEqual({ quantity: 8, expectedVersion: 4 }),
    );
  });
});
