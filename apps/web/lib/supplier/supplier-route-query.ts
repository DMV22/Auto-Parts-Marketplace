import type {
  ListingCondition,
  ListingStatus,
  SupplierListingsQuery,
  SupplierListingSort,
  SupplierOrderItemsQuery,
} from "./supplier-types";

const listingStatuses = new Set<ListingStatus>([
  "DRAFT",
  "PENDING_APPROVAL",
  "ACTIVE",
  "PAUSED",
  "REJECTED",
  "ARCHIVED",
]);
const listingConditions = new Set<ListingCondition>([
  "NEW",
  "USED",
  "REMANUFACTURED",
]);
const listingSorts = new Set<SupplierListingSort>([
  "updated_desc",
  "updated_asc",
  "price_asc",
  "price_desc",
]);
const orderStatuses = new Set<SupplierOrderItemsQuery["status"]>([
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function parseSupplierListingsQuery(
  searchParams: SearchParams,
): SupplierListingsQuery {
  const status = single(searchParams.status);
  const condition = single(searchParams.condition);
  const sort = single(searchParams.sort);
  const cursor = single(searchParams.cursor);
  return {
    status:
      status && listingStatuses.has(status as ListingStatus)
        ? (status as ListingStatus)
        : undefined,
    condition:
      condition && listingConditions.has(condition as ListingCondition)
        ? (condition as ListingCondition)
        : undefined,
    sort:
      sort && listingSorts.has(sort as SupplierListingSort)
        ? (sort as SupplierListingSort)
        : "updated_desc",
    cursor: cursor && cursor.length <= 1024 ? cursor : undefined,
    pageSize: 20,
  };
}

export function parseSupplierOrderItemsQuery(
  searchParams: SearchParams,
): SupplierOrderItemsQuery {
  const status = single(searchParams.status);
  const createdFrom = single(searchParams.createdFrom);
  const createdTo = single(searchParams.createdTo);
  const cursor = single(searchParams.cursor);
  return {
    status:
      status &&
      orderStatuses.has(status as SupplierOrderItemsQuery["status"])
        ? (status as SupplierOrderItemsQuery["status"])
        : undefined,
    createdFrom: createdFrom || undefined,
    createdTo: createdTo || undefined,
    cursor: cursor && cursor.length <= 1024 ? cursor : undefined,
    pageSize: 20,
  };
}
