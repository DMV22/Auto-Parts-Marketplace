import { queryOptions } from "@tanstack/react-query";
import { getCart } from "@/lib/commerce/cart-api";
import type { CartOwnerKey } from "@/lib/commerce/cart-owner";
import {
  getOrderDetail,
  getOrderHistory,
  getOrderTimeline,
} from "@/lib/commerce/order-api";
import { queryKeys } from "./query-keys";

export function cartQueryOptions(ownerKey: CartOwnerKey | null) {
  return queryOptions({
    queryKey: queryKeys.commerce.cart(ownerKey ?? "unavailable"),
    queryFn: ({ signal }) => getCart(signal),
    enabled: ownerKey !== null,
    staleTime: 10_000,
  });
}

export function orderDetailQueryOptions(orderId: string) {
  return queryOptions({
    queryKey: queryKeys.commerce.order(orderId),
    queryFn: ({ signal }) => getOrderDetail(orderId, signal),
    retry: false,
    staleTime: 0,
  });
}

export function orderHistoryQueryOptions(cursor: string | null) {
  return queryOptions({
    queryKey: queryKeys.commerce.orders(cursor),
    queryFn: ({ signal }) => getOrderHistory(cursor, signal),
    retry: false,
    staleTime: 10_000,
  });
}

export function orderTimelineQueryOptions(
  orderId: string,
  cursor: string | null,
) {
  return queryOptions({
    queryKey: queryKeys.commerce.orderTimeline(orderId, cursor),
    queryFn: ({ signal }) => getOrderTimeline(orderId, cursor, signal),
    retry: false,
    staleTime: 10_000,
  });
}
