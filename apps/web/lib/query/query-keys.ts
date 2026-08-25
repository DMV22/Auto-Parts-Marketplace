export const queryKeys = {
  auth: {
    session: ["auth", "session"] as const,
  },
  catalog: {
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
