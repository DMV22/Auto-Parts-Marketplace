import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { SupplierWorkspaceShell } from "@/components/supplier/SupplierWorkspaceShell";
import { createQueryClient } from "@/lib/query/query-client";
import { mockApi } from "../mocks/server";

const ROUTE_SUPPLIER_ID = "11111111-1111-4111-8111-111111111111";
const FOREIGN_SUPPLIER_ID = "22222222-2222-4222-8222-222222222222";

vi.mock("next/navigation", () => ({
  usePathname: () =>
    "/supplier/11111111-1111-4111-8111-111111111111/listings",
}));

describe("SupplierWorkspaceShell", () => {
  it("denies inactive and foreign supplier contexts", async () => {
    const scenarios = [
    {
      label: "inactive membership",
      status: "DISABLED",
      supplierId: ROUTE_SUPPLIER_ID,
      expected: "Доступ постачальника вимкнено.",
    },
    {
      label: "foreign supplier route",
      status: "ACTIVE",
      supplierId: FOREIGN_SUPPLIER_ID,
      expected:
        "Постачальника не знайдено або він не належить поточному користувачу.",
    },
    ];

    for (const scenario of scenarios) {
      mockApi.use(
        http.get("*/api/auth/get-session", () =>
          HttpResponse.json({
            session: {
              id: "session-1",
              userId: "supplier-user-1",
              expiresAt: "2027-01-01T00:00:00.000Z",
            },
            user: {
              id: "supplier-user-1",
              email: "supplier@example.com",
              name: "Supplier",
              role: "SUPPLIER_USER",
              isActive: true,
            },
          }),
        ),
        http.get("*/api/v1/me/supplier-membership", () =>
          HttpResponse.json({
            data: {
              status: scenario.status,
              supplier: {
                id: scenario.supplierId,
                name: "Supplier A",
                slug: "supplier-a",
              },
            },
          }),
        ),
      );
      const view = render(
        <QueryClientProvider client={createQueryClient()}>
          <SupplierWorkspaceShell supplierId={ROUTE_SUPPLIER_ID}>
            <p>Sensitive workspace data</p>
          </SupplierWorkspaceShell>
        </QueryClientProvider>,
      );

      expect(await screen.findByText(scenario.expected)).toBeVisible();
      expect(
        screen.queryByText("Sensitive workspace data"),
      ).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it("renders the active supplier context and current workspace route", async () => {
    mockApi.use(
      http.get("*/api/auth/get-session", () =>
        HttpResponse.json({
          session: {
            id: "session-1",
            userId: "supplier-user-1",
            expiresAt: "2027-01-01T00:00:00.000Z",
          },
          user: {
            id: "supplier-user-1",
            email: "supplier@example.com",
            name: "Supplier",
            role: "SUPPLIER_USER",
            isActive: true,
          },
        }),
      ),
      http.get("*/api/v1/me/supplier-membership", () =>
        HttpResponse.json({
          data: {
            status: "ACTIVE",
            supplier: {
              id: ROUTE_SUPPLIER_ID,
              name: "Supplier A",
              slug: "supplier-a",
            },
          },
        }),
      ),
    );

    render(
      <QueryClientProvider client={createQueryClient()}>
        <SupplierWorkspaceShell supplierId={ROUTE_SUPPLIER_ID}>
          <p>Supplier content</p>
        </SupplierWorkspaceShell>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Supplier content")).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: "Оголошення" })[0],
    ).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Активний доступ")).toBeVisible();
  });
});
