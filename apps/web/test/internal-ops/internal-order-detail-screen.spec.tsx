import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { InternalOrderDetailScreen } from "@/components/internal-ops/InternalOrderDetailScreen";
import { createQueryClient } from "@/lib/query/query-client";
import { queryKeys } from "@/lib/query/query-keys";
import { mockApi } from "../mocks/server";

vi.mock("next/navigation", () => ({
  usePathname: () => `/internal/orders/${ORDER_ID}`,
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const ORDER_ID = "11111111-1111-4111-8111-111111111111";
const ITEM_ID = "22222222-2222-4222-8222-222222222222";
const LISTING_ID = "33333333-3333-4333-8333-333333333333";
const OPERATOR_ID = "44444444-4444-4444-8444-444444444444";

describe("InternalOrderDetailScreen", () => {
  it("refetches the resource and invalidates every timeline page plus ActivityLog after transition", async () => {
    let transitioned = false;
    let timelineRequests = 0;
    mockApi.use(
      http.get("*/api/auth/get-session", () =>
        HttpResponse.json({
          session: {
            id: "session-1",
            userId: OPERATOR_ID,
            expiresAt: "2027-01-01T00:00:00.000Z",
          },
          user: {
            id: OPERATOR_ID,
            email: "support@example.test",
            name: "Support",
            role: "SUPPORT_MANAGER",
            isActive: true,
          },
        }),
      ),
      http.get("*/api/v1/internal/orders/:orderId", () =>
        HttpResponse.json({
          data: {
            orderId: ORDER_ID,
            status: transitioned ? "PROCESSING" : "PAID",
            paymentOutcome: "PAID",
            currency: "UAH",
            totalAmount: "250.00",
            createdAt: "2026-08-25T10:00:00.000Z",
            updatedAt: "2026-08-25T10:05:00.000Z",
            customer: { type: "GUEST" },
            items: [
              {
                id: ITEM_ID,
                listingId: LISTING_ID,
                productName: "Brake Pad Set",
                sku: "BRAKE-100",
                manufacturerPartNumber: "MPN-100",
                condition: "NEW",
                supplierName: "Brake Supplier",
                unitPrice: "250.00",
                quantity: 1,
                lineTotal: "250.00",
              },
            ],
          },
        }),
      ),
      http.get("*/api/v1/internal/orders/:orderId/timeline", () => {
        timelineRequests += 1;
        return HttpResponse.json({
          data: [
            {
              id: "55555555-5555-4555-8555-555555555555",
              previousStatus: transitioned ? "PAID" : "PENDING_PAYMENT",
              status: transitioned ? "PROCESSING" : "PAID",
              reasonCode: transitioned ? "STATUS_UPDATED" : "PAYMENT_CONFIRMED",
              occurredAt: "2026-08-25T10:05:00.000Z",
            },
          ],
          pageInfo: { nextCursor: null, hasNextPage: false },
        });
      }),
      http.get("*/api/v1/internal/orders/:orderId/notes", () =>
        HttpResponse.json({
          data: [],
          pageInfo: { nextCursor: null, hasNextPage: false },
        }),
      ),
      http.post("*/api/v1/internal/orders/:orderId/transitions", () => {
        transitioned = true;
        return HttpResponse.json({
          data: {
            orderId: ORDER_ID,
            previousStatus: "PAID",
            status: "PROCESSING",
            occurredAt: "2026-08-25T10:05:00.000Z",
          },
        });
      }),
    );

    const queryClient = createQueryClient();
    const olderTimelineKey = queryKeys.internalOps.orderTimeline(
      ORDER_ID,
      "older-page",
    );
    queryClient.setQueryData(olderTimelineKey, { data: [] });
    queryClient.setQueryData(queryKeys.internalOps.activityRoot, { data: [] });

    render(
      <QueryClientProvider client={queryClient}>
        <InternalOrderDetailScreen orderId={ORDER_ID} timelineCursor={null} />
      </QueryClientProvider>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Перевести в «Опрацьовується»" }),
    );

    await waitFor(() => expect(timelineRequests).toBeGreaterThan(1));
    expect(queryClient.getQueryState(olderTimelineKey)?.isInvalidated).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.internalOps.activityRoot)
        ?.isInvalidated,
    ).toBe(true);
  });
});
