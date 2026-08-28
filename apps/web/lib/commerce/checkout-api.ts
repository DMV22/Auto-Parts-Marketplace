import { apiRequest } from "@/lib/api/api-client";
import { AppError } from "@/lib/api/app-error";
import {
  checkoutSessionResponseSchema,
  type CheckoutSessionView,
} from "./checkout-types";

export async function createCheckoutSession(
  idempotencyKey: string,
): Promise<CheckoutSessionView> {
  const payload = await apiRequest<unknown>("/api/v1/checkout/session", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: {},
  });
  const result = checkoutSessionResponseSchema.safeParse(payload);

  if (!result.success) {
    throw new AppError("Checkout response does not match its contract", {
      kind: "invalid_response",
      details: result.error.flatten(),
    });
  }

  return result.data.data;
}
