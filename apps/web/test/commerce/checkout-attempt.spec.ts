import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/api/app-error";
import {
  getOrCreateCheckoutAttemptKey,
  shouldReuseCheckoutAttempt,
} from "@/lib/commerce/checkout-attempt";

const ATTEMPT_ID = "92000000-0000-4000-8000-000000000001";

describe("Checkout attempt lifecycle", () => {
  it("reuses one key for an uncertain retry and replaces it after an explicit failure", () => {
    const generate = vi.fn(() => ATTEMPT_ID);

    expect(getOrCreateCheckoutAttemptKey(null, generate)).toBe(ATTEMPT_ID);
    expect(getOrCreateCheckoutAttemptKey(ATTEMPT_ID, generate)).toBe(
      ATTEMPT_ID,
    );
    expect(generate).toHaveBeenCalledTimes(1);

    expect(
      shouldReuseCheckoutAttempt(
        new AppError("Network unavailable", { kind: "network" }),
      ),
    ).toBe(true);
    expect(
      shouldReuseCheckoutAttempt(
        new AppError("Provider unavailable", {
          kind: "unavailable",
          status: 503,
        }),
      ),
    ).toBe(false);
  });
});
