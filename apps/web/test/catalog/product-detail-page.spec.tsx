import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { ProductDetailPage } from "@/components/catalog/ProductDetailPage";
import { createQueryClient } from "@/lib/query/query-client";
import { mockApi } from "../mocks/server";

const PRODUCT_ID = "81000000-0000-4000-8000-000000000001";
const SAVED_VEHICLE_ID = "81000000-0000-4000-8000-000000000002";
const GENERATION_ID = "81000000-0000-4000-8000-000000000003";
const ENGINE_ID = "81000000-0000-4000-8000-000000000004";

describe("ProductDetailPage", () => {
  it("shows all fitment outcomes and can remove the active vehicle context", async () => {
    const productRequests: URL[] = [];

    mockApi.use(
      http.get("*/api/auth/get-session", () =>
        HttpResponse.json({
          session: {
            id: "session-1",
            userId: "user-1",
            expiresAt: "2026-09-01T00:00:00.000Z",
          },
          user: {
            id: "user-1",
            email: "pdp@example.test",
            name: "PDP Customer",
            role: "CUSTOMER",
            isActive: true,
          },
        }),
      ),
      http.get("*/api/v1/garage/vehicles", () =>
        HttpResponse.json({
          data: [
            {
              id: SAVED_VEHICLE_ID,
              year: 2020,
              label: null,
              isActive: true,
              generation: {
                id: GENERATION_ID,
                code: "E210",
                name: "XII",
                yearFrom: 2018,
                yearTo: 2022,
                model: {
                  id: "81000000-0000-4000-8000-000000000005",
                  name: "Corolla",
                  make: {
                    id: "81000000-0000-4000-8000-000000000006",
                    name: "Toyota",
                  },
                },
              },
              engine: { id: ENGINE_ID, code: "M20A", name: "2.0 Hybrid" },
            },
          ],
        }),
      ),
      http.get("*/api/v1/cart", () =>
        HttpResponse.json({
          data: {
            id: null,
            currency: null,
            totalQuantity: 0,
            totalAmount: "0.00",
            items: [],
          },
        }),
      ),
      http.get("*/api/v1/catalog/products/:productId", ({ request }) => {
        const url = new URL(request.url);
        productRequests.push(url);
        const hasVehicle = url.searchParams.has("savedVehicleId");
        return HttpResponse.json(productDetailResponse(hasVehicle));
      }),
    );

    const { container } = render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductDetailPage productId={PRODUCT_ID} />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Завантажуємо товар…")).toBeVisible();
    expect(await screen.findByRole("heading", { name: "Fitment-aware Product" })).toBeVisible();
    expect(await screen.findByText("Сумісна")).toBeVisible();
    expect(screen.getByText("Не сумісна")).toBeVisible();
    expect(screen.getByText("Потрібне уточнення")).toBeVisible();
    expect(screen.getByText("Сумісність не підтверджена")).toBeVisible();
    expect(screen.getByText("Для цієї модифікації немає достатніх даних про сумісність.")).toBeVisible();
    expect(screen.getByRole("img", { name: "Зображення товару відсутнє" })).toBeVisible();
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      expect.stringContaining("product-technical-fallback.webp"),
    );
    expect(screen.getByText(/100,00.*103,00/)).toBeVisible();
    expect(screen.getByText("3 з 4 пропозицій зараз у наявності")).toBeVisible();
    expect(
      productRequests.some(
        (request) =>
          request.searchParams.get("savedVehicleId") === SAVED_VEHICLE_ID,
      ),
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Показати без авто" }));

    await waitFor(() =>
      expect(screen.getAllByText("Сумісність не підтверджена")).toHaveLength(4),
    );
  });
});

function productDetailResponse(hasVehicle: boolean) {
  const fitments = hasVehicle
    ? [
        ["compatible", "EXACT_ENGINE_MATCH"],
        ["incompatible", "EXACT_ENGINE_EXCLUSION"],
        ["caution", "ENGINE_REQUIRED"],
        ["unknown", "NO_FITMENT_DATA"],
      ]
    : Array.from({ length: 4 }, () => ["unknown", "VEHICLE_NOT_SELECTED"]);

  return {
    data: {
      id: PRODUCT_ID,
      name: "Fitment-aware Product",
      description: "Product description",
      brand: { id: "81000000-0000-4000-8000-000000000010", name: "Bosch" },
      category: { id: "81000000-0000-4000-8000-000000000011", name: "Brakes" },
      variants: fitments.map(([status, reasonCode], index) => ({
        id: `81000000-0000-4000-8000-${String(20 + index).padStart(12, "0")}`,
        sku: `SKU-${index + 1}`,
        manufacturerPartNumber: `MPN-${index + 1}`,
        oemNumber: null,
        fitment: { status, reasonCode, matchedRule: null },
        listings: [
          {
            id: `81000000-0000-4000-8000-${String(30 + index).padStart(12, "0")}`,
            condition: "NEW",
            price: String(100 + index),
            currency: "UAH",
            inStock: index !== 1,
            supplier: {
              id: "81000000-0000-4000-8000-000000000040",
              name: "Public Supplier",
              slug: "public-supplier",
            },
          },
        ],
      })),
    },
  };
}
