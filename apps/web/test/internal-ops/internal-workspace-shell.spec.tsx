import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { InternalWorkspaceShell } from "@/components/internal-ops/InternalWorkspaceShell";
import { createQueryClient } from "@/lib/query/query-client";
import { mockApi } from "../mocks/server";

function session(role: "CUSTOMER" | "SUPPORT_MANAGER") {
  return {
    session: {
      id: "session-1",
      userId: "11111111-1111-4111-8111-111111111111",
      expiresAt: "2027-01-01T00:00:00.000Z",
    },
    user: {
      id: "11111111-1111-4111-8111-111111111111",
      email: "operator@example.test",
      name: "Operator",
      role,
      isActive: true,
    },
  };
}

describe("InternalWorkspaceShell", () => {
  it("allows SupportManager without exposing Admin moderation and denies Customer", async () => {
    mockApi.use(
      http.get("*/api/auth/get-session", () =>
        HttpResponse.json(session("SUPPORT_MANAGER")),
      ),
    );
    const supportView = render(
      <QueryClientProvider client={createQueryClient()}>
        <InternalWorkspaceShell>
          <p>Operational queue</p>
        </InternalWorkspaceShell>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Operational queue")).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Модерація" }),
    ).not.toBeInTheDocument();
    supportView.unmount();

    mockApi.use(
      http.get("*/api/auth/get-session", () =>
        HttpResponse.json(session("CUSTOMER")),
      ),
    );
    render(
      <QueryClientProvider client={createQueryClient()}>
        <InternalWorkspaceShell>
          <p>Operational queue</p>
        </InternalWorkspaceShell>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Доступ заборонено")).toBeVisible();
    expect(screen.queryByText("Operational queue")).not.toBeInTheDocument();
  });
});
