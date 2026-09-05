import type {
  ActivityQuery,
  ActivityResource,
  InternalOrdersQuery,
  InternalOrderStatus,
  InternalPaymentOutcome,
  InternalReturnsQuery,
  ModerationQuery,
  ReturnRequestStatus,
} from "./internal-ops-types";

type SearchParams = Record<string, string | string[] | undefined>;
const orderStatuses = new Set<InternalOrderStatus>([
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);
const paymentOutcomes = new Set<InternalPaymentOutcome>([
  "PENDING",
  "PAID",
  "FAILED_OR_EXPIRED",
  "NOT_APPLICABLE",
]);
const returnStatuses = new Set<ReturnRequestStatus>([
  "REQUESTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "RECEIVED",
  "COMPLETED",
  "CANCELLED",
]);
const activityResources = new Set<ActivityResource>([
  "ORDER",
  "RETURN_REQUEST",
  "LISTING",
  "NOTE",
]);
const listingStatuses = new Set<NonNullable<ModerationQuery["status"]>>([
  "DRAFT",
  "PENDING_APPROVAL",
  "ACTIVE",
  "PAUSED",
  "REJECTED",
  "ARCHIVED",
]);
const listingConditions = new Set<NonNullable<ModerationQuery["condition"]>>([
  "NEW",
  "USED",
  "REMANUFACTURED",
]);

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function bounded(value: string | undefined, maximum = 1024) {
  return value && value.length <= maximum ? value : undefined;
}

export function parseInternalOrdersQuery(raw: SearchParams): InternalOrdersQuery {
  const status = single(raw.status);
  const paymentOutcome = single(raw.paymentOutcome);
  return {
    status:
      status && orderStatuses.has(status as InternalOrderStatus)
        ? (status as InternalOrderStatus)
        : undefined,
    paymentOutcome:
      paymentOutcome &&
      paymentOutcomes.has(paymentOutcome as InternalPaymentOutcome)
        ? (paymentOutcome as InternalPaymentOutcome)
        : undefined,
    createdFrom: bounded(single(raw.createdFrom), 64),
    createdTo: bounded(single(raw.createdTo), 64),
    cursor: bounded(single(raw.cursor)),
    limit: 20,
  };
}

export function parseInternalReturnsQuery(
  raw: SearchParams,
): InternalReturnsQuery {
  const status = single(raw.status);
  return {
    status:
      status && returnStatuses.has(status as ReturnRequestStatus)
        ? (status as ReturnRequestStatus)
        : undefined,
    createdFrom: bounded(single(raw.createdFrom), 64),
    createdTo: bounded(single(raw.createdTo), 64),
    cursor: bounded(single(raw.cursor)),
    limit: 20,
  };
}

export function parseActivityQuery(raw: SearchParams): ActivityQuery {
  const resourceType = single(raw.resourceType);
  return {
    actorId: bounded(single(raw.actorId), 64),
    action: bounded(single(raw.action), 100),
    resourceType:
      resourceType && activityResources.has(resourceType as ActivityResource)
        ? (resourceType as ActivityResource)
        : undefined,
    resourceId: bounded(single(raw.resourceId), 64),
    createdFrom: bounded(single(raw.createdFrom), 64),
    createdTo: bounded(single(raw.createdTo), 64),
    cursor: bounded(single(raw.cursor)),
    limit: 20,
  };
}

export function parseModerationQuery(raw: SearchParams): ModerationQuery {
  const status = single(raw.status);
  const condition = single(raw.condition);
  return {
    status:
      status && listingStatuses.has(status as NonNullable<ModerationQuery["status"]>)
        ? (status as NonNullable<ModerationQuery["status"]>)
        : "PENDING_APPROVAL",
    condition:
      condition &&
      listingConditions.has(
        condition as NonNullable<ModerationQuery["condition"]>,
      )
        ? (condition as NonNullable<ModerationQuery["condition"]>)
        : undefined,
    supplierId: bounded(single(raw.supplierId), 64),
    createdFrom: bounded(single(raw.createdFrom), 64),
    createdTo: bounded(single(raw.createdTo), 64),
    cursor: bounded(single(raw.cursor)),
    pageSize: 20,
  };
}

export function toDateTimeLocal(value: string | undefined): string {
  return value ? value.slice(0, 16) : "";
}

export function localDateTimeToIso(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function internalCursorHref(
  path: string,
  query: object,
  cursor: string,
  paginationKey: "limit" | "pageSize",
): string {
  const search = new URLSearchParams();
  Object.entries({ ...query, cursor }).forEach(([key, value]) => {
    if (key !== paginationKey && value !== undefined) {
      search.set(key, String(value));
    }
  });
  return `${path}?${search}`;
}
