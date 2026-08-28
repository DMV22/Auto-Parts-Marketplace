import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/api/app-error";
import {
  presentCartError,
  presentCartIssue,
} from "@/lib/commerce/cart-presentation";

describe("Cart presentation", () => {
  it("maps backend availability issues and stable error kinds to actionable copy", () => {
    expect(presentCartIssue("LISTING_UNAVAILABLE")).toEqual({
      title: "Пропозиція більше недоступна",
      message: "Видаліть її з кошика та оберіть іншу активну пропозицію.",
    });
    expect(presentCartIssue("INSUFFICIENT_STOCK").title).toBe(
      "Недостатньо товару в наявності",
    );
    expect(presentCartIssue("CURRENCY_MISMATCH").title).toBe(
      "Валюта пропозиції змінилася",
    );

    expect(
      presentCartError(
        new AppError("Insufficient listing stock", {
          kind: "conflict",
          status: 409,
        }),
      ),
    ).toMatchObject({
      title: "Кошик змінився",
      retryable: true,
    });
  });
});
