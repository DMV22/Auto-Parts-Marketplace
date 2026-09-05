import { QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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

  it("lets a Google-only user create a credential password", async () => {
    let credentialCreated = false;

    mockApi.use(
      http.get("*/api/auth/list-accounts", () =>
        HttpResponse.json([
          { id: "google-id", providerId: "google" },
          ...(credentialCreated
            ? [{ id: "credential-id", providerId: "credential" }]
            : []),
        ]),
      ),
      http.post("*/api/v1/me/password", async ({ request }) => {
        expect(await request.json()).toEqual({
          newPassword: "new-password-123",
        });
        credentialCreated = true;
        return HttpResponse.json({ status: true });
      }),
    );

    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Створити пароль" }),
    ).toBeVisible();
    fireEvent.change(screen.getByLabelText("Новий пароль"), {
      target: { value: "new-password-123" },
    });
    fireEvent.change(screen.getByLabelText("Підтвердьте пароль"), {
      target: { value: "new-password-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Створити пароль" }));

    expect(
      await screen.findByRole("status", { name: "Пароль створено" }),
    ).toBeVisible();
    const credentialRow = screen.getByText("Email і пароль").closest("li");
    expect(credentialRow).not.toBeNull();
    expect(within(credentialRow!).getByText("Підключено")).toBeVisible();
  });
});
