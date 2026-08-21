import { apiRequest } from "@/lib/api/api-client";
import { AppError } from "@/lib/api/app-error";
import {
  orderDetailResponseSchema,
  orderHistoryResponseSchema,
  orderTimelineResponseSchema,
  type OrderDetail,
  type OrderHistoryResponse,
  type OrderTimelineResponse,
} from "./order-types";

const DEFAULT_PAGE_SIZE = 20;

function paginatedPath(path: string, cursor: string | null): string {
  const parameters = new URLSearchParams({ limit: String(DEFAULT_PAGE_SIZE) });
  if (cursor) parameters.set("cursor", cursor);
  return `${path}?${parameters.toString()}`;
}

function contractError(contract: string, details: unknown): AppError {
  return new AppError(`${contract} response does not match its contract`, {
    kind: "invalid_response",
    details,
  });
}

export async function getOrderHistory(
  cursor: string | null,
  signal?: AbortSignal,
): Promise<OrderHistoryResponse> {
  const payload = await apiRequest<unknown>(paginatedPath("/api/v1/orders", cursor), {
    signal,
  });
  const result = orderHistoryResponseSchema.safeParse(payload);
  if (!result.success) {
    throw contractError("Order history", result.error.flatten());
  }
  return result.data;
}

export async function getOrderDetail(
  orderId: string,
  signal?: AbortSignal,
): Promise<OrderDetail> {
  const payload = await apiRequest<unknown>(`/api/v1/orders/${orderId}`, {
    signal,
  });
  const result = orderDetailResponseSchema.safeParse(payload);

  if (!result.success) {
    throw contractError("Order", result.error.flatten());
  }

  return result.data.data;
}

export async function getOrderTimeline(
  orderId: string,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<OrderTimelineResponse> {
  const payload = await apiRequest<unknown>(
    paginatedPath(`/api/v1/orders/${orderId}/timeline`, cursor),
    { signal },
  );
  const result = orderTimelineResponseSchema.safeParse(payload);
  if (!result.success) {
    throw contractError("Order timeline", result.error.flatten());
  }
  return result.data;
}
