import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogPage } from "@/components/catalog/CatalogPage";
import { createQueryClient } from "@/lib/query/query-client";
import { mockApi } from "../mocks/server";

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
  search: "q=brake",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

const SAVED_VEHICLE_ID = "55555555-5555-4555-8555-555555555555";

describe("CatalogPage", () => {
  beforeEach(() => {
    navigation.replace.mockReset();
    navigation.search = "q=brake";
  });

  it("loads products for the active vehicle and keeps filter context visible", async () => {
    const catalogRequests: URL[] = [];

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
            email: "catalog@example.test",
            name: "Catalog Customer",
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
                id: "33333333-3333-4333-8333-333333333333",
                code: "E210",
                name: "XII",
                yearFrom: 2018,
                yearTo: 2022,
                model: {
                  id: "22222222-2222-4222-8222-222222222222",
                  name: "Corolla",
                  make: {
                    id: "11111111-1111-4111-8111-111111111111",
                    name: "Toyota",
                  },
                },
              },
              engine: {
                id: "44444444-4444-4444-8444-444444444444",
                code: "M20A",
                name: "2.0 Hybrid",
              },
            },
          ],
        }),
      ),
      http.get("*/api/v1/catalog/filter-options", () =>
        HttpResponse.json({
          data: {
            brands: [],
            categories: [],
            currencies: [
              { code: "UAH", minimumPrice: "80", maximumPrice: "500" },
            ],
          },
          meta: { truncated: false },
        }),
      ),
      http.get("*/api/v1/catalog/products", async ({ request }) => {
        catalogRequests.push(new URL(request.url));
        await delay(50);
        return HttpResponse.json({
          data: [
            {
              id: "66666666-6666-4666-8666-666666666666",
              name: "Brake Pad Set",
              description: "Front axle ceramic pads",
              brand: {
                id: "77777777-7777-4777-8777-777777777777",
                name: "Bosch",
              },
              category: null,
              minimumPrice: { amount: "250", currency: "UAH" },
              variants: [
                {
                  id: "88888888-8888-4888-8888-888888888888",
                  sku: "BRAKE-100",
                  manufacturerPartNumber: "MPN-100",
                  oemNumber: null,
                  listings: [
                    {
                      id: "99999999-9999-4999-8999-999999999999",
                      condition: "NEW",
                      price: "250",
                      currency: "UAH",
                      inStock: true,
                    },
                  ],
                },
              ],
            },
          ],
          meta: {
            page: 1,
            pageSize: 20,
            total: 1,
            totalPages: 1,
            sort: "newest",
          },
        });
      }),
    );

    render(
      <QueryClientProvider client={createQueryClient()}>
        <CatalogPage />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Завантажуємо каталог…")).toBeVisible();
    expect(
      await screen.findByRole(
        "heading",
        { name: "Brake Pad Set" },
        { timeout: 5_000 },
      ),
    ).toBeVisible();
    expect(screen.getByText(/Toyota Corolla/)).toBeVisible();
    expect(screen.getByDisplayValue("brake")).toBeVisible();
    expect(catalogRequests.at(-1)?.searchParams.get("savedVehicleId")).toBe(
      SAVED_VEHICLE_ID,
    );
    expect(catalogRequests.at(-1)?.searchParams.get("currency")).toBe("UAH");
  });
});
