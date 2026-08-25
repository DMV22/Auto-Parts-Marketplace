import { describe, expect, it } from "vitest";
import {
  canSubmitReturnTransition,
  nextOrderStatus,
  nextReturnStatuses,
} from "@/lib/internal-ops/internal-ops-presentation";
import { activityResponseSchema } from "@/lib/internal-ops/internal-ops-types";

describe("internal operations presentation", () => {
  it("offers only the agreed operational order and return transitions", () => {
    expect(nextOrderStatus("PAID")).toBe("PROCESSING");
    expect(nextOrderStatus("PROCESSING")).toBe("SHIPPED");
    expect(nextOrderStatus("SHIPPED")).toBe("DELIVERED");
    expect(nextOrderStatus("PENDING_PAYMENT")).toBeNull();
    expect(nextOrderStatus("DELIVERED")).toBeNull();

    expect(nextReturnStatuses("REQUESTED")).toEqual(["UNDER_REVIEW"]);
    expect(nextReturnStatuses("UNDER_REVIEW")).toEqual([
      "APPROVED",
      "REJECTED",
    ]);
    expect(nextReturnStatuses("APPROVED")).toEqual(["RECEIVED"]);
    expect(nextReturnStatuses("RECEIVED")).toEqual(["COMPLETED"]);
    expect(nextReturnStatuses("REJECTED")).toEqual([]);
    expect(nextReturnStatuses("COMPLETED")).toEqual([]);
    expect(canSubmitReturnTransition("REJECTED", "")).toBe(false);
    expect(canSubmitReturnTransition("REJECTED", "Wrong item")).toBe(true);
    expect(canSubmitReturnTransition("APPROVED", "")).toBe(true);
  });

  it("rejects activity metadata outside the frontend privacy allowlist", () => {
    const event = {
      id: "11111111-1111-4111-8111-111111111111",
      actorUserId: "22222222-2222-4222-8222-222222222222",
      actorRole: "ADMIN",
      resourceType: "NOTE",
      resourceId: "33333333-3333-4333-8333-333333333333",
      action: "NOTE_REDACTED",
      previousStatus: null,
      newStatus: null,
      reason: "Contains sensitive data",
      createdAt: "2026-08-25T12:00:00.000Z",
    };

    expect(
      activityResponseSchema.safeParse({
        data: [{ ...event, metadata: { noteId: event.resourceId } }],
        pageInfo: { nextCursor: null, hasNextPage: false },
      }).success,
    ).toBe(true);
    expect(
      activityResponseSchema.safeParse({
        data: [
          {
            ...event,
            metadata: {
              noteId: event.resourceId,
              paymentPayload: "must-not-render",
            },
          },
        ],
        pageInfo: { nextCursor: null, hasNextPage: false },
      }).success,
    ).toBe(false);
  });
});
