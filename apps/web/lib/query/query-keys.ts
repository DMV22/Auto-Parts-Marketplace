import type { NoteTarget } from "@/lib/internal-ops/internal-ops-types";

export const queryKeys = {
  auth: {
    accounts: ["auth", "accounts"] as const,
    session: ["auth", "session"] as const,
  },
  catalog: {
    root: ["catalog"] as const,
    filterOptions: ["catalog", "filter-options"] as const,
    products: (query: string, savedVehicleId: string | null) =>
      ["catalog", "products", query, savedVehicleId] as const,
    productDetail: (productId: string, savedVehicleId: string | null) =>
      ["catalog", "product-detail", productId, savedVehicleId] as const,
  },
  commerce: {
    cart: (ownerKey: string) => ["commerce", "cart", ownerKey] as const,
    orders: (cursor: string | null) =>
      ["commerce", "orders", cursor] as const,
    order: (orderId: string) => ["commerce", "order", orderId] as const,
    orderTimeline: (orderId: string, cursor: string | null) =>
      ["commerce", "order-timeline", orderId, cursor] as const,
    returns: (orderId: string, orderItemId: string) =>
      ["commerce", "returns", orderId, orderItemId] as const,
  },
  garage: {
    vehicles: ["garage", "vehicles"] as const,
  },
  internalOps: {
    ordersRoot: ["internal-ops", "orders"] as const,
    orders: (query: string) => ["internal-ops", "orders", query] as const,
    order: (orderId: string) =>
      ["internal-ops", "order", orderId] as const,
    orderTimelineRoot: (orderId: string) =>
      ["internal-ops", "order", orderId, "timeline"] as const,
    orderTimeline: (orderId: string, cursor: string | null) =>
      ["internal-ops", "order", orderId, "timeline", cursor] as const,
    returnsRoot: ["internal-ops", "returns"] as const,
    returns: (query: string) => ["internal-ops", "returns", query] as const,
    return: (returnRequestId: string) =>
      ["internal-ops", "return", returnRequestId] as const,
    notesRoot: (targetType: NoteTarget["type"], targetId: string) =>
      ["internal-ops", "notes", targetType, targetId] as const,
    notes: (targetType: NoteTarget["type"], targetId: string, cursor: string | null) =>
      ["internal-ops", "notes", targetType, targetId, cursor] as const,
    activityRoot: ["internal-ops", "activity"] as const,
    activity: (query: string) =>
      ["internal-ops", "activity", query] as const,
    moderationRoot: ["internal-ops", "moderation"] as const,
    moderation: (query: string) =>
      ["internal-ops", "moderation", query] as const,
  },
  supplier: {
    membership: ["supplier", "membership"] as const,
    variants: (supplierId: string, query: string, cursor: string | null) =>
      ["supplier", supplierId, "variants", query, cursor] as const,
    variant: (supplierId: string, variantId: string) =>
      ["supplier", supplierId, "variant", variantId] as const,
    listings: (supplierId: string, query: string) =>
      ["supplier", supplierId, "listings", query] as const,
    listingsRoot: (supplierId: string) =>
      ["supplier", supplierId, "listings"] as const,
    listing: (supplierId: string, listingId: string) =>
      ["supplier", supplierId, "listing", listingId] as const,
    orderItems: (supplierId: string, query: string) =>
      ["supplier", supplierId, "order-items", query] as const,
    orderItem: (supplierId: string, orderItemId: string) =>
      ["supplier", supplierId, "order-item", orderItemId] as const,
  },
  vehicles: {
    taxonomy: {
      years: ["vehicles", "taxonomy", "years"] as const,
      makes: (year: number) =>
        ["vehicles", "taxonomy", "makes", year] as const,
      models: (year: number, makeId: string) =>
        ["vehicles", "taxonomy", "models", year, makeId] as const,
      generations: (year: number, modelId: string) =>
        ["vehicles", "taxonomy", "generations", year, modelId] as const,
      engines: (generationId: string) =>
        ["vehicles", "taxonomy", "engines", generationId] as const,
    },
  },
} as const;
