import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import {
  canCancelReturn,
  canCreateReturn,
  presentReturnStatus,
} from "@/lib/commerce/return-presentation";
import { invalidateReturnState } from "@/lib/query/commerce-queries";
import { queryKeys } from "@/lib/query/query-keys";

const orderId = "11111111-1111-4111-8111-111111111111";
const orderItemId = "22222222-2222-4222-8222-222222222222";

describe("Return presentation", () => {
  it("maps eligibility and customer-cancellable statuses", () => {
    expect(canCreateReturn("DELIVERED", [])).toBe(true);
    expect(canCreateReturn("SHIPPED", [])).toBe(false);
    expect(canCreateReturn("DELIVERED", ["UNDER_REVIEW"])).toBe(false);
    expect(canCreateReturn("DELIVERED", ["COMPLETED"])).toBe(true);
    expect(canCancelReturn("APPROVED")).toBe(true);
    expect(canCancelReturn("RECEIVED")).toBe(false);
    expect(presentReturnStatus("UNDER_REVIEW")).toMatchObject({
      label: "На розгляді",
      terminal: false,
    });
  });

  it("invalidates the nested return state after create or cancel", async () => {
    const queryClient = new QueryClient();
    const key = queryKeys.commerce.returns(orderId, orderItemId);
    queryClient.setQueryData(key, { data: [] });

    await invalidateReturnState(queryClient, orderId, orderItemId);

    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
  });
});
