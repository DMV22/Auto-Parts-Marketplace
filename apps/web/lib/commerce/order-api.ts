import { apiRequest } from "@/lib/api/api-client";
import { AppError } from "@/lib/api/app-error";
import { orderDetailResponseSchema, type OrderDetail } from "./order-types";

export async function getOrderDetail(
  orderId: string,
  signal?: AbortSignal,
): Promise<OrderDetail> {
  const payload = await apiRequest<unknown>(`/api/v1/orders/${orderId}`, {
    signal,
  });
  const result = orderDetailResponseSchema.safeParse(payload);

  if (!result.success) {
    throw new AppError("Order response does not match its contract", {
      kind: "invalid_response",
      details: result.error.flatten(),
    });
  }

  return result.data.data;
}
