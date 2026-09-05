import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { SupplierListingForm } from "@/components/supplier/SupplierListingForm";
import { createQueryClient } from "@/lib/query/query-client";
import type { SupplierListing } from "@/lib/supplier/supplier-types";
import { mockApi } from "../mocks/server";

const SUPPLIER_ID = "11111111-1111-4111-8111-111111111111";
const LISTING_ID = "22222222-2222-4222-8222-222222222222";
const CURRENT_VARIANT_ID = "33333333-3333-4333-8333-333333333333";
const FIRST_RESULT_ID = "44444444-4444-4444-8444-444444444444";
const UNAVAILABLE_VARIANT_ID = "55555555-5555-4555-8555-555555555555";

const listing: SupplierListing = {
  id: LISTING_ID,
  supplierId: SUPPLIER_ID,
  status: "DRAFT",
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
    id: CURRENT_VARIANT_ID,
    sku: "CURRENT-SKU",
    manufacturerPartNumber: "CURRENT-MPN",
    oemNumber: null,
  },
};

function variant(id: string, sku: string, name: string) {
  return {
    id,
    sku,
    manufacturerPartNumber: `${sku}-MPN`,
    oemNumber: null,
    product: {
      id: "66666666-6666-4666-8666-666666666666",
      name,
      brand: {
        id: "77777777-7777-4777-8777-777777777777",
        name: "Bosch",
      },
      category: null,
    },
  };
}

describe("SupplierListingForm", () => {
  it("uses paged variant discovery, validates selection and patches only changed fields", async () => {
    let patchBody: unknown;
    let unavailableVariantChecks = 0;
    mockApi.use(
      http.get(
        "*/api/v1/suppliers/:supplierId/product-variants",
        ({ request }) => {
          const cursor = new URL(request.url).searchParams.get("cursor");
          return HttpResponse.json({
            data: cursor
              ? [variant(UNAVAILABLE_VARIANT_ID, "PAGE-2", "Second result")]
              : [variant(FIRST_RESULT_ID, "PAGE-1", "First result")],
            pageInfo: {
              nextCursor: cursor ? null : "next-page",
              hasNextPage: !cursor,
            },
          });
        },
      ),
      http.get(
        "*/api/v1/suppliers/:supplierId/product-variants/:variantId",
        ({ params }) => {
          if (params.variantId === UNAVAILABLE_VARIANT_ID) {
            unavailableVariantChecks += 1;
            return unavailableVariantChecks === 1
              ? HttpResponse.json(
                  { message: "Temporarily unavailable" },
                  { status: 503 },
                )
              : HttpResponse.json({ message: "Not found" }, { status: 404 });
          }
          return HttpResponse.json({
            data: variant(CURRENT_VARIANT_ID, "CURRENT-SKU", "Current product"),
          });
        },
      ),
      http.patch(
        "*/api/v1/suppliers/:supplierId/listings/:listingId",
        async ({ request }) => {
          patchBody = await request.json();
          return HttpResponse.json({ ...listing, price: "125" });
        },
      ),
    );

    render(
      <QueryClientProvider client={createQueryClient()}>
        <SupplierListingForm
          supplierId={SUPPLIER_ID}
          listing={listing}
          onSaved={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/Обрано: Current product/)).toBeVisible();
    fireEvent.change(screen.getByLabelText("Ціна"), {
      target: { value: "125" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Зберегти зміни" }));
    await waitFor(() => expect(patchBody).toEqual({ price: "125" }));

    fireEvent.change(screen.getByLabelText("Пошук варіанта товару"), {
      target: { value: "brake" },
    });
    expect(await screen.findByText(/PAGE-1/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Наступні результати" }));
    expect(await screen.findByText(/PAGE-2/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Обрати" }));

    expect(
      await screen.findByText(/Не вдалося перевірити обраний варіант товару/),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Повторити перевірку" }),
    );
    expect(
      await screen.findByText(/варіант товару більше недоступний/),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Зберегти зміни" }),
    ).toBeDisabled();
  });
});
