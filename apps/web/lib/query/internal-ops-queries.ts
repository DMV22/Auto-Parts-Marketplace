import { queryOptions } from "@tanstack/react-query";
import {
  getActivityLog,
  getInternalNotes,
  getInternalOrder,
  getInternalOrders,
  getInternalOrderTimeline,
  getInternalReturn,
  getInternalReturns,
  getModerationListings,
} from "@/lib/internal-ops/internal-ops-api";
import type {
  ActivityQuery,
  InternalOrdersQuery,
  InternalReturnsQuery,
  ModerationQuery,
  NoteTarget,
} from "@/lib/internal-ops/internal-ops-types";
import { queryKeys } from "./query-keys";

function stableQuery(query: object): string {
  return JSON.stringify(query);
}

export function internalOrdersQueryOptions(query: InternalOrdersQuery) {
  return queryOptions({
    queryKey: queryKeys.internalOps.orders(stableQuery(query)),
    queryFn: ({ signal }) => getInternalOrders(query, signal),
    retry: false,
    staleTime: 10_000,
  });
}

export function internalOrderQueryOptions(orderId: string) {
  return queryOptions({
    queryKey: queryKeys.internalOps.order(orderId),
    queryFn: ({ signal }) => getInternalOrder(orderId, signal),
    retry: false,
  });
}

export function internalOrderTimelineQueryOptions(
  orderId: string,
  cursor: string | null,
) {
  return queryOptions({
    queryKey: queryKeys.internalOps.orderTimeline(orderId, cursor),
    queryFn: ({ signal }) =>
      getInternalOrderTimeline(orderId, cursor, signal),
    retry: false,
  });
}

export function internalReturnsQueryOptions(query: InternalReturnsQuery) {
  return queryOptions({
    queryKey: queryKeys.internalOps.returns(stableQuery(query)),
    queryFn: ({ signal }) => getInternalReturns(query, signal),
    retry: false,
    staleTime: 10_000,
  });
}

export function internalReturnQueryOptions(returnRequestId: string) {
  return queryOptions({
    queryKey: queryKeys.internalOps.return(returnRequestId),
    queryFn: ({ signal }) => getInternalReturn(returnRequestId, signal),
    retry: false,
  });
}

export function internalNotesQueryOptions(
  target: NoteTarget,
  cursor: string | null,
) {
  return queryOptions({
    queryKey: queryKeys.internalOps.notes(target.type, target.id, cursor),
    queryFn: ({ signal }) => getInternalNotes(target, cursor, signal),
    retry: false,
  });
}

export function activityQueryOptions(query: ActivityQuery) {
  return queryOptions({
    queryKey: queryKeys.internalOps.activity(stableQuery(query)),
    queryFn: ({ signal }) => getActivityLog(query, signal),
    retry: false,
    staleTime: 10_000,
  });
}

export function moderationQueryOptions(query: ModerationQuery) {
  return queryOptions({
    queryKey: queryKeys.internalOps.moderation(stableQuery(query)),
    queryFn: ({ signal }) => getModerationListings(query, signal),
    retry: false,
    staleTime: 10_000,
  });
}
