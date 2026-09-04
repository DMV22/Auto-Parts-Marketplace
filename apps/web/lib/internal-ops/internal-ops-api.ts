import { AppError } from "@/lib/api/app-error";
import { apiRequest } from "@/lib/api/api-client";
import { supplierListingSchema, type SupplierListing } from "@/lib/supplier/supplier-types";
import {
  activityResponseSchema,
  internalNoteResponseSchema,
  internalNotesResponseSchema,
  internalOrderDetailResponseSchema,
  internalOrdersResponseSchema,
  internalOrderTransitionResponseSchema,
  internalReturnDetailResponseSchema,
  internalReturnsResponseSchema,
  moderationResponseSchema,
  orderTimelineResponseSchema,
  returnTransitionResponseSchema,
  type ActivityQuery,
  type InternalOrderStatus,
  type InternalOrdersQuery,
  type InternalReturnsQuery,
  type ModerationQuery,
  type NoteTarget,
  type ReturnRequestStatus,
} from "./internal-ops-types";

function parse<T>(
  schema: {
    safeParse: (value: unknown) => {
      success: boolean;
      data?: T;
      error?: { flatten?: () => unknown };
    };
  },
  payload: unknown,
  contract: string,
): T {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new AppError(`${contract} response does not match its contract`, {
      kind: "invalid_response",
      details: result.error?.flatten?.() ?? result.error,
    });
  }
  return result.data as T;
}

function withQuery(
  path: string,
  query: Record<string, string | number | undefined>,
): string {
  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) search.set(key, String(value));
  });
  return search.size ? `${path}?${search.toString()}` : path;
}

export async function getInternalOrders(
  query: InternalOrdersQuery,
  signal?: AbortSignal,
) {
  const payload = await apiRequest<unknown>(
    withQuery("/api/v1/internal/orders", { ...query, limit: query.limit ?? 20 }),
    { signal },
  );
  return parse(internalOrdersResponseSchema, payload, "Internal Orders");
}

export async function getInternalOrder(orderId: string, signal?: AbortSignal) {
  const payload = await apiRequest<unknown>(
    `/api/v1/internal/orders/${encodeURIComponent(orderId)}`,
    { signal },
  );
  return parse(internalOrderDetailResponseSchema, payload, "Internal Order").data;
}

export async function getInternalOrderTimeline(
  orderId: string,
  cursor: string | null,
  signal?: AbortSignal,
) {
  const payload = await apiRequest<unknown>(
    withQuery(
      `/api/v1/internal/orders/${encodeURIComponent(orderId)}/timeline`,
      { cursor: cursor ?? undefined, limit: 20 },
    ),
    { signal },
  );
  return parse(orderTimelineResponseSchema, payload, "Internal Order timeline");
}

export async function transitionInternalOrder(
  orderId: string,
  targetStatus: InternalOrderStatus,
  reason: string | null,
) {
  const payload = await apiRequest<unknown>(
    `/api/v1/internal/orders/${encodeURIComponent(orderId)}/transitions`,
    { method: "POST", body: { targetStatus, ...(reason ? { reason } : {}) } },
  );
  return parse(
    internalOrderTransitionResponseSchema,
    payload,
    "Internal Order transition",
  ).data;
}

export async function getInternalReturns(
  query: InternalReturnsQuery,
  signal?: AbortSignal,
) {
  const payload = await apiRequest<unknown>(
    withQuery("/api/v1/internal/returns", { ...query, limit: query.limit ?? 20 }),
    { signal },
  );
  return parse(internalReturnsResponseSchema, payload, "Internal Returns");
}

export async function getInternalReturn(
  returnRequestId: string,
  signal?: AbortSignal,
) {
  const payload = await apiRequest<unknown>(
    `/api/v1/internal/returns/${encodeURIComponent(returnRequestId)}`,
    { signal },
  );
  return parse(internalReturnDetailResponseSchema, payload, "Internal Return")
    .data;
}

export async function transitionInternalReturn(
  returnRequestId: string,
  targetStatus: ReturnRequestStatus,
  reason: string | null,
) {
  const payload = await apiRequest<unknown>(
    `/api/v1/internal/returns/${encodeURIComponent(returnRequestId)}/transitions`,
    { method: "POST", body: { targetStatus, ...(reason ? { reason } : {}) } },
  );
  return parse(returnTransitionResponseSchema, payload, "Return transition").data;
}

function notePath(target: NoteTarget): string {
  return target.type === "ORDER"
    ? `/api/v1/internal/orders/${encodeURIComponent(target.id)}/notes`
    : `/api/v1/internal/returns/${encodeURIComponent(target.id)}/notes`;
}

export async function getInternalNotes(
  target: NoteTarget,
  cursor: string | null,
  signal?: AbortSignal,
) {
  const payload = await apiRequest<unknown>(
    withQuery(notePath(target), { cursor: cursor ?? undefined, limit: 20 }),
    { signal },
  );
  return parse(internalNotesResponseSchema, payload, "Internal Notes");
}

export async function createInternalNote(
  target: NoteTarget,
  body: string,
  correctsNoteId: string | null,
) {
  const payload = await apiRequest<unknown>(notePath(target), {
    method: "POST",
    body: { body, ...(correctsNoteId ? { correctsNoteId } : {}) },
  });
  return parse(internalNoteResponseSchema, payload, "Internal Note").data;
}

export async function redactInternalNote(noteId: string, reason: string) {
  const payload = await apiRequest<unknown>(
    `/api/v1/internal/notes/${encodeURIComponent(noteId)}/redact`,
    { method: "POST", body: { reason } },
  );
  return parse(internalNoteResponseSchema, payload, "Redacted Note").data;
}

export async function getActivityLog(
  query: ActivityQuery,
  signal?: AbortSignal,
) {
  const payload = await apiRequest<unknown>(
    withQuery("/api/v1/internal/activity", { ...query, limit: query.limit ?? 20 }),
    { signal },
  );
  return parse(activityResponseSchema, payload, "ActivityLog");
}

export async function getModerationListings(
  query: ModerationQuery,
  signal?: AbortSignal,
) {
  const payload = await apiRequest<unknown>(
    withQuery("/api/v1/admin/moderation/listings", {
      ...query,
      pageSize: query.pageSize ?? 20,
    }),
    { signal },
  );
  return parse(moderationResponseSchema, payload, "Moderation queue");
}

export async function moderateListing(
  listingId: string,
  action: "approve" | "reject" | "pause",
  reason?: string,
): Promise<SupplierListing> {
  const payload = await apiRequest<unknown>(
    `/api/v1/admin/moderation/listings/${encodeURIComponent(listingId)}/${action}`,
    {
      method: "POST",
      ...(action === "approve" ? {} : { body: { reason } }),
    },
  );
  return parse(supplierListingSchema, payload, "Moderated Listing");
}
