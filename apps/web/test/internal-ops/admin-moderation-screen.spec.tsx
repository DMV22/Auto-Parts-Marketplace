import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { AdminModerationScreen } from "@/components/internal-ops/AdminModerationScreen";
import { createQueryClient } from "@/lib/query/query-client";
import { queryKeys } from "@/lib/query/query-keys";
import { mockApi } from "../mocks/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const LISTING_ID = "11111111-1111-4111-8111-111111111111";
const SUPPLIER_ID = "22222222-2222-4222-8222-222222222222";
const VARIANT_ID = "33333333-3333-4333-8333-333333333333";

function listing(status: "PENDING_APPROVAL" | "REJECTED") {
  return {
    id: LISTING_ID,
    supplierId: SUPPLIER_ID,
    status,
    condition: "NEW",
    price: "250",
    currency: "UAH",
    stockQuantity: 5,
    inventoryVersion: 1,
    rejectionReason: status === "REJECTED" ? "Unsafe description" : null,
    moderationReason: status === "REJECTED" ? "Unsafe description" : null,
    createdAt: "2026-08-25T10:00:00.000Z",
    updatedAt: "2026-08-25T10:00:00.000Z",
    productVariant: {
      id: VARIANT_ID,
      sku: "BRAKE-100",
      manufacturerPartNumber: "MPN-100",
      oemNumber: null,
    },
  };
}

describe("AdminModerationScreen", () => {
  it("sends a supplier-visible rejection reason and removes the item after refetch", async () => {
    let rejected = false;
    let submittedBody: unknown;
    mockApi.use(
      http.get("*/api/v1/admin/moderation/listings", () =>
        HttpResponse.json({
          data: rejected
            ? []
            : [
                {
                  ...listing("PENDING_APPROVAL"),
                  supplier: { id: SUPPLIER_ID, name: "Brake Supplier" },
                },
              ],
          meta: { pageSize: 20, nextCursor: null },
        }),
      ),
      http.post(
        "*/api/v1/admin/moderation/listings/:listingId/reject",
        async ({ request }) => {
          submittedBody = await request.json();
          rejected = true;
          return HttpResponse.json(listing("REJECTED"));
        },
      ),
    );

    const queryClient = createQueryClient();
    const publicCatalogKey = queryKeys.catalog.products("{}", null);
    queryClient.setQueryData(publicCatalogKey, { data: [LISTING_ID] });
    render(
      <QueryClientProvider client={queryClient}>
        <AdminModerationScreen query={{ status: "PENDING_APPROVAL" }} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("BRAKE-100")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Reject…" }));
    fireEvent.change(
      screen.getByLabelText("Supplier-visible rejection reason"),
      { target: { value: "Unsafe description" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Підтвердити reject" }),
    );

    await waitFor(() =>
      expect(submittedBody).toEqual({ reason: "Unsafe description" }),
    );
    expect(
      await screen.findByText("Listings за цими фільтрами відсутні."),
    ).toBeVisible();
    expect(screen.queryByText("BRAKE-100")).not.toBeInTheDocument();
    expect(queryClient.getQueryState(publicCatalogKey)?.isInvalidated).toBe(
      true,
    );
  });
});
