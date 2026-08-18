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
  garage: {
    vehicles: ["garage", "vehicles"] as const,
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
