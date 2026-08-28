import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { getCart } from "@/lib/commerce/cart-api";
import type { CartOwnerKey } from "@/lib/commerce/cart-owner";
import {
  getOrderDetail,
  getOrderHistory,
  getOrderTimeline,
} from "@/lib/commerce/order-api";
import { getCustomerReturns } from "@/lib/commerce/return-api";
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

export function customerReturnsQueryOptions(
  orderId: string,
  orderItemId: string,
  enabled: boolean,
) {
  return queryOptions({
    queryKey: queryKeys.commerce.returns(orderId, orderItemId),
    queryFn: ({ signal }) =>
      getCustomerReturns(orderId, orderItemId, signal),
    enabled,
    retry: false,
    staleTime: 10_000,
  });
}

export function invalidateReturnState(
  queryClient: QueryClient,
  orderId: string,
  orderItemId: string,
) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.commerce.returns(orderId, orderItemId),
  });
}
