import { apiRequest } from "@/lib/api/api-client";
import { AppError } from "@/lib/api/app-error";
import {
  customerReturnResponseSchema,
  customerReturnsResponseSchema,
  returnTransitionResponseSchema,
  type CustomerReturn,
  type CustomerReturnsResponse,
  type ReturnTransition,
} from "./return-types";

function returnsPath(orderId: string, orderItemId: string): string {
  return `/api/v1/orders/${orderId}/items/${orderItemId}/returns`;
}

function contractError(contract: string, details: unknown): AppError {
  return new AppError(`${contract} response does not match its contract`, {
    kind: "invalid_response",
    details,
  });
}

export async function getCustomerReturns(
  orderId: string,
  orderItemId: string,
  signal?: AbortSignal,
): Promise<CustomerReturnsResponse> {
  const payload = await apiRequest<unknown>(returnsPath(orderId, orderItemId), {
    signal,
  });
  const result = customerReturnsResponseSchema.safeParse(payload);
  if (!result.success) {
    throw contractError("Customer returns", result.error.flatten());
  }
  return result.data;
}

export async function createCustomerReturn(
  orderId: string,
  orderItemId: string,
  reason: string,
): Promise<CustomerReturn> {
  const payload = await apiRequest<unknown>(returnsPath(orderId, orderItemId), {
    method: "POST",
    body: { reason },
  });
  const result = customerReturnResponseSchema.safeParse(payload);
  if (!result.success) {
    throw contractError("Create return", result.error.flatten());
  }
  return result.data.data;
}

export async function cancelCustomerReturn(
  orderId: string,
  orderItemId: string,
  returnRequestId: string,
): Promise<ReturnTransition> {
  const payload = await apiRequest<unknown>(
    `${returnsPath(orderId, orderItemId)}/${returnRequestId}/cancel`,
    { method: "POST" },
  );
  const result = returnTransitionResponseSchema.safeParse(payload);
  if (!result.success) {
    throw contractError("Cancel return", result.error.flatten());
  }
  return result.data.data;
}
