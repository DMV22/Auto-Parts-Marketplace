import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { SupplierListingDetail } from "@/components/supplier/SupplierListingDetail";
import { createQueryClient } from "@/lib/query/query-client";
import type { SupplierListing } from "@/lib/supplier/supplier-types";
import { mockApi } from "../mocks/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const SUPPLIER_ID = "11111111-1111-4111-8111-111111111111";
const LISTING_ID = "22222222-2222-4222-8222-222222222222";

const listing: SupplierListing = {
  id: LISTING_ID,
  supplierId: SUPPLIER_ID,
  status: "PENDING_APPROVAL",
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
    sku: "BRAKE-1",
    manufacturerPartNumber: "MPN-1",
    oemNumber: null,
  },
};

describe("SupplierListingDetail", () => {
  it("requires confirmation before archiving a listing", async () => {
    let archiveRequests = 0;
    mockApi.use(
      http.get(
        "*/api/v1/suppliers/:supplierId/listings/:listingId",
        () => HttpResponse.json(listing),
      ),
      http.post(
        "*/api/v1/suppliers/:supplierId/listings/:listingId/archive",
        () => {
          archiveRequests += 1;
          return HttpResponse.json({ ...listing, status: "ARCHIVED" });
        },
      ),
    );

    render(
      <QueryClientProvider client={createQueryClient()}>
        <SupplierListingDetail
          supplierId={SUPPLIER_ID}
          listingId={LISTING_ID}
        />
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Архівувати" }));
    expect(archiveRequests).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "Підтвердити" }));
    await waitFor(() => expect(archiveRequests).toBe(1));
  });
});
