import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { InternalNotesPanel } from "@/components/internal-ops/InternalNotesPanel";
import { createQueryClient } from "@/lib/query/query-client";
import { mockApi } from "../mocks/server";

const navigation = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => `/internal/orders/${ORDER_ID}`,
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(),
}));

const ORDER_ID = "11111111-1111-4111-8111-111111111111";
const NOTE_ID = "22222222-2222-4222-8222-222222222222";
const ADMIN_ID = "33333333-3333-4333-8333-333333333333";

function note(isRedacted: boolean) {
  return {
    id: NOTE_ID,
    target: { type: "ORDER", id: ORDER_ID },
    author: { id: ADMIN_ID, name: "Admin", role: "ADMIN" },
    body: isRedacted ? null : "Sensitive operational note",
    isRedacted,
    correctsNoteId: null,
    redactedAt: isRedacted ? "2026-08-25T12:05:00.000Z" : null,
    redactionReason: isRedacted ? "Contains customer data" : null,
    createdAt: "2026-08-25T12:00:00.000Z",
  };
}

describe("InternalNotesPanel", () => {
  it("lets Admin redact a note and renders a tombstone after refetch", async () => {
    let redacted = false;
    let submittedBody: unknown;
    mockApi.use(
      http.get("*/api/auth/get-session", () =>
        HttpResponse.json({
          session: {
            id: "session-1",
            userId: ADMIN_ID,
            expiresAt: "2027-01-01T00:00:00.000Z",
          },
          user: {
            id: ADMIN_ID,
            email: "admin@example.test",
            name: "Admin",
            role: "ADMIN",
            isActive: true,
          },
        }),
      ),
      http.get("*/api/v1/internal/orders/:orderId/notes", () =>
        HttpResponse.json({
          data: [note(redacted)],
          pageInfo: { nextCursor: "older-notes", hasNextPage: true },
        }),
      ),
      http.post("*/api/v1/internal/notes/:noteId/redact", async ({ request }) => {
        submittedBody = await request.json();
        redacted = true;
        return HttpResponse.json({ data: note(true) });
      }),
    );

    render(
      <QueryClientProvider client={createQueryClient()}>
        <InternalNotesPanel target={{ type: "ORDER", id: ORDER_ID }} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Sensitive operational note")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Старіші notes" }));
    expect(navigation.replace).toHaveBeenCalledWith(
      `/internal/orders/${ORDER_ID}?notesCursor=older-notes`,
      { scroll: false },
    );
    fireEvent.click(screen.getByRole("button", { name: "Redact" }));
    fireEvent.change(screen.getByLabelText("Причина redaction"), {
      target: { value: "Contains customer data" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Підтвердити redaction" }),
    );

    await waitFor(() =>
      expect(submittedBody).toEqual({ reason: "Contains customer data" }),
    );
    expect(await screen.findByText("Note redacted")).toBeVisible();
    expect(screen.queryByText("Sensitive operational note")).not.toBeInTheDocument();
  });
});
