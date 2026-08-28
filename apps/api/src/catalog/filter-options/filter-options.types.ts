export type CatalogFilterOption = {
  id: string;
  name: string;
};

export type CatalogCurrencyOption = {
  code: string;
  minimumPrice: string;
  maximumPrice: string;
};

export type FilterOptionsResponse = {
  data: {
    brands: CatalogFilterOption[];
    categories: CatalogFilterOption[];
    currencies: CatalogCurrencyOption[];
  };
  meta: {
    truncated: boolean;
  };
};

export type FilterOptionsQuery = Record<string, never>;
