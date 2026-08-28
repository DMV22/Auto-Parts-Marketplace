import { describe, expect, it } from "vitest";
import { presentCheckoutStatus } from "@/lib/commerce/checkout-presentation";

describe("Checkout status presentation", () => {
  it("distinguishes pending, paid and polling timeout without claiming false payment", () => {
    expect(
      presentCheckoutStatus("PENDING_PAYMENT", false, "success"),
    ).toMatchObject({
      tone: "pending",
      title: "Очікуємо підтвердження оплати",
      polling: true,
    });
    expect(presentCheckoutStatus("PAID", false, "success")).toMatchObject({
      tone: "success",
      title: "Оплату підтверджено",
      polling: false,
    });
    expect(
      presentCheckoutStatus("PENDING_PAYMENT", true, "success"),
    ).toMatchObject({
      tone: "warning",
      title: "Підтвердження займає більше часу",
      polling: false,
    });
  });
});
