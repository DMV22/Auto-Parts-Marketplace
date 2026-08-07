import type { ListingCondition } from '../generated/prisma/enums';

export type CatalogSort =
  | 'newest'
  | 'name_asc'
  | 'name_desc'
  | 'price_asc'
  | 'price_desc';

export type CatalogQuery = {
  q: string | null;
  categoryId: string | null;
  brandId: string | null;
  minPrice: string | null;
  maxPrice: string | null;
  currency: string | null;
  inStock: boolean | null;
  condition: ListingCondition | null;
  year: number | null;
  generationId: string | null;
  engineTypeId: string | null;
  savedVehicleId: string | null;
  page: number;
  pageSize: number;
  sort: CatalogSort;
};

export type VehicleContext = {
  year: number;
  generationId: string;
  engineTypeId: string | null;
};

export type CatalogListing = {
  id: string;
  condition: ListingCondition;
  price: string;
  currency: string;
  inStock: boolean;
};

export type CatalogVariant = {
  id: string;
  sku: string;
  manufacturerPartNumber: string;
  oemNumber: string | null;
  listings: CatalogListing[];
};

export type CatalogProduct = {
  id: string;
  name: string;
  description: string | null;
  brand: { id: string; name: string };
  category: { id: string; name: string } | null;
  minimumPrice: { amount: string; currency: string } | null;
  variants: CatalogVariant[];
};

export type CatalogResponse = {
  data: CatalogProduct[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    sort: CatalogSort;
  };
};
