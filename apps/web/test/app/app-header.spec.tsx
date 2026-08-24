import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppHeader } from "@/components/shell/app-header";
import { createQueryClient } from "@/lib/query/query-client";
import { queryKeys } from "@/lib/query/query-keys";
import { customerSessionProjectionFixture } from "../fixtures/auth";
import { mockApi } from "../mocks/server";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

describe("AppHeader", () => {
  beforeEach(() => refresh.mockReset());

  it("offers authentication actions to an anonymous visitor", async () => {
    mockApi.use(
      http.get("*/api/auth/get-session", () => HttpResponse.json(null)),
    );
    render(
      <QueryClientProvider client={createQueryClient()}>
        <AppHeader />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("link", { name: "Увійти" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
    expect(screen.getByRole("link", { name: "Реєстрація" })).toHaveAttribute(
      "href",
      "/sign-up",
    );
  });

  it("shows the safe session projection and signs out", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(
      queryKeys.auth.session,
      customerSessionProjectionFixture,
    );
    mockApi.use(
      http.post("*/api/auth/sign-out", () => HttpResponse.json({ success: true })),
      http.get("*/api/auth/get-session", () => HttpResponse.json(null)),
    );
    render(
      <QueryClientProvider client={queryClient}>
        <AppHeader />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Customer")).toBeInTheDocument();
    expect(screen.getByText("Клієнт")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Вийти" }));

    await waitFor(() =>
      expect(queryClient.getQueryData(queryKeys.auth.session)).toBeNull(),
    );
    expect(refresh).toHaveBeenCalledOnce();
    expect(await screen.findByRole("link", { name: "Увійти" })).toBeVisible();
  });
});
