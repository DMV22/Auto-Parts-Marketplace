import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { AccountSecurityPage } from "@/components/auth/account-security-page";
import { createQueryClient } from "@/lib/query/query-client";
import { queryKeys } from "@/lib/query/query-keys";
import { customerSessionProjectionFixture } from "../fixtures/auth";
import { mockApi } from "../mocks/server";

function renderPage() {
  const queryClient = createQueryClient();
  queryClient.setQueryData(
    queryKeys.auth.session,
    customerSessionProjectionFixture,
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <AccountSecurityPage />
    </QueryClientProvider>,
  );
}

describe("AccountSecurityPage", () => {
  it("offers explicit Google linking and refreshes linked accounts", async () => {
    let linked = false;

    mockApi.use(
      http.get("*/api/auth/list-accounts", () =>
        HttpResponse.json([
          { id: "credential-id", providerId: "credential" },
          ...(linked ? [{ id: "google-id", providerId: "google" }] : []),
        ]),
      ),
      http.post("*/api/auth/link-social", async ({ request }) => {
        expect(await request.json()).toEqual({
          callbackURL: "/account/security?linked=google",
          errorCallbackURL: "/account/security?linkError=google",
          provider: "google",
        });
        linked = true;
        return HttpResponse.json({ redirect: false, status: true, url: "" });
      }),
    );

    renderPage();

    expect(await screen.findByText("Google не підключено")).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Підключити Google" }),
    );

    await waitFor(() =>
      expect(screen.getByText("Google підключено")).toBeVisible(),
    );
  });

  it("does not expose linking controls for an inactive account", () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(queryKeys.auth.session, {
      ...customerSessionProjectionFixture,
      user: { ...customerSessionProjectionFixture.user, isActive: false },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AccountSecurityPage />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Акаунт неактивний")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Підключити Google" }),
    ).not.toBeInTheDocument();
  });
});
