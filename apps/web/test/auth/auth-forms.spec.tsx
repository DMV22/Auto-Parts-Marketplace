import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { createQueryClient } from "@/lib/query/query-client";
import { queryKeys } from "@/lib/query/query-keys";
import { customerSessionResponseFixture } from "../fixtures/auth";
import { mockApi } from "../mocks/server";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

function renderForm(form: ReactElement) {
  const queryClient = createQueryClient();
  const view = render(
    <QueryClientProvider client={queryClient}>
      {form}
    </QueryClientProvider>,
  );

  return { ...view, queryClient };
}

describe("authentication forms", () => {
  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
  });

  it("announces validation errors without submitting sign-in", async () => {
    renderForm(<SignInForm returnTo="/" />);

    fireEvent.click(screen.getByRole("button", { name: "Увійти" }));

    expect(
      await screen.findByText("Введіть коректну email-адресу"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Пароль має містити щонайменше 8 символів"),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("signs in, refreshes the session and uses the safe destination", async () => {
    mockApi.use(
      http.post("*/api/auth/sign-in/email", () =>
        HttpResponse.json({ user: customerSessionResponseFixture.user }),
      ),
      http.get("*/api/auth/get-session", () =>
        HttpResponse.json(customerSessionResponseFixture),
      ),
    );
    const { queryClient } = renderForm(<SignInForm returnTo="/garage" />);
    queryClient.setQueryData(queryKeys.internalOps.ordersRoot, {
      sensitive: "previous identity",
    });

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "customer@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Пароль"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Увійти" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/garage"));
    expect(
      queryClient.getQueryData(queryKeys.internalOps.ordersRoot),
    ).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.auth.session)).toEqual({
      session: {
        expiresAt: customerSessionResponseFixture.session.expiresAt,
        id: customerSessionResponseFixture.session.id,
        userId: customerSessionResponseFixture.session.userId,
      },
      user: customerSessionResponseFixture.user,
    });
    expect(
      queryClient.getQueryData<{ session: Record<string, unknown> }>(
        queryKeys.auth.session,
      )?.session,
    ).not.toHaveProperty("token");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("shows an accessible backend authentication error", async () => {
    mockApi.use(
      http.post("*/api/auth/sign-in/email", () =>
        HttpResponse.json(
          { message: "Invalid email or password" },
          { status: 401 },
        ),
      ),
    );
    renderForm(<SignInForm returnTo="/" />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "customer@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Пароль"), {
      target: { value: "wrongpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Увійти" }));

    expect(
      await screen.findByRole("alert", {
        name: "Не вдалося виконати вхід",
      }),
    ).toHaveTextContent("Перевірте email і пароль");
  });

  it("explains how to explicitly link Google after an account-not-linked callback", () => {
    renderForm(
      <SignInForm returnTo="/garage" oauthError="account_not_linked" />,
    );

    expect(
      screen.getByRole("alert", { name: "Google-акаунт ще не підключено" }),
    ).toHaveTextContent(
      "Увійдіть за допомогою email і пароля, а потім відкрийте «Безпека акаунта»",
    );
  });

  it("validates the customer name during sign-up", async () => {
    renderForm(<SignUpForm returnTo="/" />);

    fireEvent.change(screen.getByLabelText("Ім’я"), {
      target: { value: "A" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Створити акаунт" }),
    );

    expect(
      await screen.findByText("Ім’я має містити щонайменше 2 символи"),
    ).toBeInTheDocument();
  });
});
