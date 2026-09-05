export type SupplierProductVariantCursor = {
  version: 1;
  query: string | null;
  productName: string;
  sku: string;
  id: string;
};

export type SupplierProductVariantsQuery = {
  query: string | null;
  cursor: SupplierProductVariantCursor | null;
  limit: number;
};

export type SupplierProductVariantDto = {
  id: string;
  sku: string;
  manufacturerPartNumber: string;
  oemNumber: string | null;
  product: {
    id: string;
    name: string;
    brand: { id: string; name: string };
    category: { id: string; name: string } | null;
  };
};

export type SupplierProductVariantDetailResponse = {
  data: SupplierProductVariantDto;
};

export type SupplierProductVariantsResponse = {
  data: SupplierProductVariantDto[];
  pageInfo: {
    nextCursor: string | null;
    hasNextPage: boolean;
  };
};
