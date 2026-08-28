import { describe, expect, it } from "vitest";
import { isRouteVisibleForRole } from "@/lib/routing/route-access";

describe("frontend route visibility metadata", () => {
  it("keeps public routes visible without a persisted role", () => {
    expect(isRouteVisibleForRole("public", null)).toBe(true);
  });

  it("keeps role-aware navigation aligned with the documented workspaces", () => {
    expect(isRouteVisibleForRole("customer", "CUSTOMER")).toBe(true);
    expect(isRouteVisibleForRole("supplier", "SUPPORT_MANAGER")).toBe(false);
    expect(isRouteVisibleForRole("internal", "SUPPORT_MANAGER")).toBe(true);
    expect(isRouteVisibleForRole("admin", "SUPPORT_MANAGER")).toBe(false);
  });
});
