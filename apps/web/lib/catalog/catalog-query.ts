import type { CatalogFilterOptionsResponse } from "./catalog-types";

export const catalogSorts = [
  "newest",
  "name_asc",
  "name_desc",
  "price_asc",
  "price_desc",
] as const;

export const listingConditions = ["NEW", "USED", "REMANUFACTURED"] as const;

export type CatalogSort = (typeof catalogSorts)[number];
export type ListingCondition = (typeof listingConditions)[number];

export type CatalogQueryState = {
  q: string;
  categoryId: string | null;
  brandId: string | null;
  minPrice: string | null;
  maxPrice: string | null;
  currency: string | null;
  inStock: boolean | null;
  condition: ListingCondition | null;
  page: number;
  pageSize: number;
  sort: CatalogSort;
};

export type ParsedCatalogSearchParams = {
  state: CatalogQueryState;
  searchParams: URLSearchParams;
  wasNormalized: boolean;
};

export type ResolvedCatalogQuery = {
  state: CatalogQueryState;
  searchParams: URLSearchParams;
  wasNormalized: boolean;
};

export const defaultCatalogQuery: CatalogQueryState = {
  q: "",
  categoryId: null,
  brandId: null,
  minPrice: null,
  maxPrice: null,
  currency: null,
  inStock: null,
  condition: null,
  page: 1,
  pageSize: 20,
  sort: "newest",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRICE_PATTERN = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;
const DOCUMENTED_KEYS = new Set([
  "q",
  "categoryId",
  "brandId",
  "minPrice",
  "maxPrice",
  "currency",
  "inStock",
  "condition",
  "page",
  "pageSize",
  "sort",
]);

export function parseCatalogSearchParams(
  input: URLSearchParams,
): ParsedCatalogSearchParams {
  const state: CatalogQueryState = {
    q: text(input, "q", 120) ?? "",
    categoryId: uuid(input, "categoryId"),
    brandId: uuid(input, "brandId"),
    minPrice: price(input, "minPrice"),
    maxPrice: price(input, "maxPrice"),
    currency: currency(input),
    inStock: boolean(input, "inStock"),
    condition: oneOf(input, "condition", listingConditions),
    page: integer(input, "page", 1, 1_000_000) ?? 1,
    pageSize: integer(input, "pageSize", 1, 50) ?? 20,
    sort: oneOf(input, "sort", catalogSorts) ?? "newest",
  };

  if (!state.currency) {
    state.minPrice = null;
    state.maxPrice = null;
    if (state.sort.startsWith("price_")) state.sort = "newest";
  }
  if (
    state.minPrice &&
    state.maxPrice &&
    Number(state.minPrice) > Number(state.maxPrice)
  ) {
    state.minPrice = null;
    state.maxPrice = null;
  }

  const searchParams = serializeCatalogQuery(state);
  return {
    state,
    searchParams,
    wasNormalized: !equivalentParams(input, searchParams),
  };
}

export function serializeCatalogQuery(
  input: CatalogQueryState,
): URLSearchParams {
  const state = normalizeForSerialization(input);
  const params = new URLSearchParams();

  set(params, "q", state.q || null);
  set(params, "categoryId", state.categoryId);
  set(params, "brandId", state.brandId);
  set(params, "minPrice", state.minPrice);
  set(params, "maxPrice", state.maxPrice);
  set(params, "currency", state.currency);
  set(
    params,
    "inStock",
    state.inStock === null ? null : String(state.inStock),
  );
  set(params, "condition", state.condition);
  set(params, "page", state.page === 1 ? null : String(state.page));
  set(params, "pageSize", state.pageSize === 20 ? null : String(state.pageSize));
  set(params, "sort", state.sort === "newest" ? null : state.sort);

  return params;
}

export function resolveCatalogQuery(
  parsed: ParsedCatalogSearchParams,
  options: CatalogFilterOptionsResponse | undefined,
): ResolvedCatalogQuery {
  let state = parsed.state;

  if (options && !options.meta.truncated) {
    const update: Partial<CatalogQueryState> = {};

    if (
      state.brandId &&
      !options.data.brands.some(({ id }) => id === state.brandId)
    ) {
      update.brandId = null;
    }
    if (
      state.categoryId &&
      !options.data.categories.some(({ id }) => id === state.categoryId)
    ) {
      update.categoryId = null;
    }
    if (
      state.currency &&
      !options.data.currencies.some(({ code }) => code === state.currency)
    ) {
      update.currency = null;
      update.minPrice = null;
      update.maxPrice = null;
      if (state.sort.startsWith("price_")) update.sort = "newest";
    }

    if (Object.keys(update).length > 0) state = { ...state, ...update };
  }

  const onlyCurrency =
    options?.data.currencies.length === 1
      ? options.data.currencies[0]
      : undefined;
  if (!state.currency && onlyCurrency) {
    state = { ...state, currency: onlyCurrency.code };
  }

  const searchParams = serializeCatalogQuery(state);
  return {
    state,
    searchParams,
    wasNormalized:
      parsed.wasNormalized ||
      parsed.searchParams.toString() !== searchParams.toString(),
  };
}

export function withCatalogFilter(
  state: CatalogQueryState,
  update: Partial<CatalogQueryState>,
): CatalogQueryState {
  return { ...state, ...update, page: 1 };
}

function normalizeForSerialization(
  input: CatalogQueryState,
): CatalogQueryState {
  const currencyCode = input.currency?.trim().toUpperCase() ?? null;
  const currencyValue =
    currencyCode && /^[A-Z]{3}$/.test(currencyCode) ? currencyCode : null;
  const q = input.q.trim();
  const state = {
    ...input,
    q: q.length <= 120 ? q : "",
    categoryId:
      input.categoryId && UUID_PATTERN.test(input.categoryId)
        ? input.categoryId
        : null,
    brandId:
      input.brandId && UUID_PATTERN.test(input.brandId) ? input.brandId : null,
    minPrice:
      input.minPrice && PRICE_PATTERN.test(input.minPrice)
        ? input.minPrice
        : null,
    maxPrice:
      input.maxPrice && PRICE_PATTERN.test(input.maxPrice)
        ? input.maxPrice
        : null,
    currency: currencyValue,
  };
  if (!state.currency) {
    state.minPrice = null;
    state.maxPrice = null;
    if (state.sort.startsWith("price_")) state.sort = "newest";
  }
  if (
    state.minPrice &&
    state.maxPrice &&
    Number(state.minPrice) > Number(state.maxPrice)
  ) {
    state.minPrice = null;
    state.maxPrice = null;
  }
  return state;
}

function value(params: URLSearchParams, key: string): string | null {
  const values = params.getAll(key);
  return values.length === 1 ? (values[0] ?? null) : null;
}

function text(
  params: URLSearchParams,
  key: string,
  maximumLength: number,
): string | null {
  const item = value(params, key)?.trim();
  return item && item.length <= maximumLength ? item : null;
}

function uuid(params: URLSearchParams, key: string): string | null {
  const item = value(params, key);
  return item && UUID_PATTERN.test(item) ? item : null;
}

function price(params: URLSearchParams, key: string): string | null {
  const item = value(params, key);
  return item && PRICE_PATTERN.test(item) ? item : null;
}

function currency(params: URLSearchParams): string | null {
  const item = value(params, "currency")?.toUpperCase();
  return item && /^[A-Z]{3}$/.test(item) ? item : null;
}

function boolean(
  params: URLSearchParams,
  key: string,
): boolean | null {
  const item = value(params, key);
  return item === "true" ? true : item === "false" ? false : null;
}

function integer(
  params: URLSearchParams,
  key: string,
  minimum: number,
  maximum: number,
): number | null {
  const item = value(params, key);
  if (!item || !/^\d+$/.test(item)) return null;
  const parsed = Number(item);
  return parsed >= minimum && parsed <= maximum ? parsed : null;
}

function oneOf<const T extends readonly string[]>(
  params: URLSearchParams,
  key: string,
  allowed: T,
): T[number] | null {
  const item = value(params, key);
  return item && allowed.includes(item) ? (item as T[number]) : null;
}

function set(
  params: URLSearchParams,
  key: string,
  value: string | null,
): void {
  if (value !== null) params.set(key, value);
}

function equivalentParams(
  input: URLSearchParams,
  normalized: URLSearchParams,
): boolean {
  if ([...input.keys()].some((key) => !DOCUMENTED_KEYS.has(key))) return false;
  return input.toString() === normalized.toString();
}
