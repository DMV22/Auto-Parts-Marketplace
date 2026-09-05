import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { ReturnItemPanel } from "@/components/orders/ReturnItemPanel";
import { createQueryClient } from "@/lib/query/query-client";
import { mockApi } from "../mocks/server";

const ORDER_ID = "11111111-1111-4111-8111-111111111111";
const ITEM_ID = "22222222-2222-4222-8222-222222222222";
const RETURN_ID = "33333333-3333-4333-8333-333333333333";

describe("ReturnItemPanel", () => {
  it("creates a Customer return and refetches the nested return state", async () => {
    let created = false;
    let cancelled = false;
    let listRequests = 0;
    let submittedReason: unknown;
    let cancelRequests = 0;

    mockApi.use(
      http.get("*/api/auth/get-session", () =>
        HttpResponse.json({
          session: {
            id: "session-1",
            userId: "customer-1",
            expiresAt: "2027-01-01T00:00:00.000Z",
          },
          user: {
            id: "customer-1",
            email: "customer@example.com",
            name: "Customer",
            role: "CUSTOMER",
            isActive: true,
          },
        }),
      ),
      http.get(
        `*/api/v1/orders/${ORDER_ID}/items/${ITEM_ID}/returns`,
        () => {
          listRequests += 1;
          return HttpResponse.json({
            data: created
              ? [
                  {
                    id: RETURN_ID,
                    orderId: ORDER_ID,
                    orderItemId: ITEM_ID,
                    status: cancelled ? "CANCELLED" : "REQUESTED",
                    reason: "Деталь не підійшла",
                    decisionReason: null,
                    createdAt: "2026-08-22T10:00:00.000Z",
                    updatedAt: "2026-08-22T10:00:00.000Z",
                  },
                ]
              : [],
          });
        },
      ),
      http.post(
        `*/api/v1/orders/${ORDER_ID}/items/${ITEM_ID}/returns`,
        async ({ request }) => {
          submittedReason = await request.json();
          created = true;
          return HttpResponse.json({
            data: {
              id: RETURN_ID,
              orderId: ORDER_ID,
              orderItemId: ITEM_ID,
              status: "REQUESTED",
              reason: "Деталь не підійшла",
              decisionReason: null,
              createdAt: "2026-08-22T10:00:00.000Z",
              updatedAt: "2026-08-22T10:00:00.000Z",
            },
          });
        },
      ),
      http.post(
        `*/api/v1/orders/${ORDER_ID}/items/${ITEM_ID}/returns/${RETURN_ID}/cancel`,
        () => {
          cancelRequests += 1;
          cancelled = true;
          return HttpResponse.json({
            data: {
              id: RETURN_ID,
              previousStatus: "REQUESTED",
              status: "CANCELLED",
              updatedAt: "2026-08-22T10:05:00.000Z",
            },
          });
        },
      ),
    );

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ReturnItemPanel
          orderId={ORDER_ID}
          orderItemId={ITEM_ID}
          orderStatus="DELIVERED"
        />
      </QueryClientProvider>,
    );

    const reason = await screen.findByLabelText("Причина повернення");
    fireEvent.change(reason, { target: { value: "Деталь не підійшла" } });
    fireEvent.click(screen.getByRole("button", { name: "Створити запит" }));

    expect(await screen.findByText("Запит створено")).toBeVisible();
    expect(submittedReason).toEqual({ reason: "Деталь не підійшла" });
    await waitFor(() => expect(listRequests).toBe(2));

    fireEvent.click(screen.getByRole("button", { name: "Скасувати запит" }));
    expect(cancelRequests).toBe(0);
    fireEvent.click(
      screen.getByRole("button", { name: "Підтвердити скасування" }),
    );

    expect(await screen.findByText("Скасовано")).toBeVisible();
    expect(cancelRequests).toBe(1);
    await waitFor(() => expect(listRequests).toBe(3));
  });
});
