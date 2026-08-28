import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/api/app-error";
import {
  presentOrderError,
  presentOrderItemSnapshot,
  presentOrderStatus,
  presentTimelineReason,
} from "@/lib/commerce/order-presentation";

describe("Order presentation", () => {
  it("maps public order and timeline states without exposing internal payment data", () => {
    expect(presentOrderStatus("PENDING_PAYMENT")).toMatchObject({
      label: "Очікує оплати",
      tone: "pending",
    });
    expect(presentOrderStatus("DELIVERED")).toMatchObject({
      label: "Доставлено",
      tone: "success",
    });
    expect(presentTimelineReason("PAYMENT_CONFIRMED")).toBe(
      "Оплату підтверджено",
    );
  });

  it("uses one non-disclosing state for missing and foreign orders", () => {
    const missing = presentOrderError(
      new AppError("Order does not exist", {
        kind: "not_found",
        status: 404,
      }),
    );
    const foreign = presentOrderError(
      new AppError("Order belongs to another owner", {
        kind: "not_found",
        status: 404,
      }),
    );

    expect(missing).toEqual(foreign);
    expect(missing).toMatchObject({
      title: "Замовлення недоступне",
      retryable: false,
    });
  });

  it("presents the immutable item snapshot without requiring current listing data", () => {
    expect(
      presentOrderItemSnapshot({
        id: "11111111-1111-4111-8111-111111111111",
        listingId: "22222222-2222-4222-8222-222222222222",
        productName: null,
        sku: "ARCHIVED-SKU",
        manufacturerPartNumber: null,
        condition: "REMANUFACTURED",
        supplierName: null,
        unitPrice: "120.00",
        quantity: 2,
        lineTotal: "240.00",
      }),
    ).toEqual({
      name: "Товар із замовлення",
      sku: "ARCHIVED-SKU",
      manufacturerPartNumber: null,
      supplierName: null,
      condition: "Відновлений",
    });
  });
});
