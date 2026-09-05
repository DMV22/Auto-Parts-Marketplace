import { QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppHeader } from "@/components/shell/app-header";
import { createQueryClient } from "@/lib/query/query-client";
import { queryKeys } from "@/lib/query/query-keys";
import { customerSessionProjectionFixture } from "../fixtures/auth";
import { mockApi } from "../mocks/server";

const refresh = vi.fn();

const cartResponse = {
  data: {
    id: null,
    currency: null,
    totalQuantity: 0,
    totalAmount: "0.00",
    items: [],
  },
};

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh }),
}));

describe("AppHeader", () => {
  beforeEach(() => refresh.mockReset());

  it("offers authentication actions to an anonymous visitor", async () => {
    mockApi.use(
      http.get("*/api/auth/get-session", () => HttpResponse.json(null)),
      http.get("*/api/v1/cart", () => HttpResponse.json(cartResponse)),
    );
    render(
      <QueryClientProvider client={createQueryClient()}>
        <AppHeader />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole(
        "link",
        { name: "Увійти" },
        { timeout: 5_000 },
      ),
    ).toHaveAttribute("href", "/sign-in");
    expect(
      screen.getByRole("link", { name: "Створити акаунт" }),
    ).toHaveAttribute("href", "/sign-up");
    expect(screen.getByRole("link", { name: "Гараж" })).toHaveAttribute(
      "href",
      "/garage",
    );
    expect(screen.getByRole("button", { name: "Кошик" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Відкрити меню" }));

    const mobileMenu = await screen.findByRole("dialog");
    expect(
      within(mobileMenu).getByRole("heading", { name: "Навігація" }),
    ).toBeInTheDocument();
    expect(
      within(mobileMenu).getByRole("link", { name: "Каталог" }),
    ).toHaveAttribute("href", "/catalog");
    expect(
      within(mobileMenu).getByRole("button", { name: "Закрити" }),
    ).toBeInTheDocument();
  });

  it("shows the safe session projection and signs out", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(
      queryKeys.auth.session,
      customerSessionProjectionFixture,
    );
    queryClient.setQueryData(queryKeys.internalOps.orders("{}"), {
      data: [{ id: "must-be-removed-on-sign-out" }],
    });
    mockApi.use(
      http.post("*/api/auth/sign-out", () => HttpResponse.json({ success: true })),
      http.get("*/api/auth/get-session", () => HttpResponse.json(null)),
      http.get("*/api/v1/cart", () =>
        HttpResponse.json({
          data: { ...cartResponse.data, totalQuantity: 3 },
        }),
      ),
    );
    render(
      <QueryClientProvider client={queryClient}>
        <AppHeader />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("button", { name: "Кошик, 3 товари" }),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Мій кабінет, Customer" }),
    );

    const accountMenu = await screen.findByRole("menu");
    expect(within(accountMenu).getByText("Customer")).toBeVisible();
    expect(within(accountMenu).getByText("Клієнт")).toBeVisible();
    expect(
      within(accountMenu).getByRole("menuitem", { name: "Мій гараж" }),
    ).toHaveAttribute(
      "href",
      "/garage",
    );
    expect(
      within(accountMenu).getByRole("menuitem", { name: "Безпека акаунта" }),
    ).toHaveAttribute("href", "/account/security");
    fireEvent.click(
      within(accountMenu).getByRole("menuitem", { name: "Вийти" }),
    );

    await waitFor(() =>
      expect(queryClient.getQueryData(queryKeys.auth.session)).toBeNull(),
    );
    expect(queryClient.getQueryData(queryKeys.internalOps.orders("{}"))).toBeUndefined();
    expect(refresh).toHaveBeenCalledOnce();
    expect(await screen.findByRole("link", { name: "Увійти" })).toBeVisible();
  });

  it("shows only role-appropriate utilities for an active Admin", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(queryKeys.auth.session, {
      session: {
        id: "admin-session-id",
        userId: "admin-user-id",
        expiresAt: "2026-08-25T12:00:00.000Z",
      },
      user: {
        id: "admin-user-id",
        email: "admin@example.test",
        name: "Admin User",
        role: "ADMIN",
        isActive: true,
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AppHeader />
      </QueryClientProvider>,
    );

    expect(screen.queryByRole("button", { name: /Кошик/u })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Гараж" })).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Мій кабінет, Admin User" }),
    );
    const accountMenu = await screen.findByRole("menu");
    expect(
      within(accountMenu).getByRole("menuitem", { name: "Internal Orders" }),
    ).toHaveAttribute("href", "/internal/orders");
    expect(
      within(accountMenu).getByRole("menuitem", { name: "Модерація" }),
    ).toHaveAttribute("href", "/admin/moderation");
  });
});
