import { z } from "zod";
import { catalogSorts, listingConditions } from "./catalog-query";

const moneySchema = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/);
const currencySchema = z.string().regex(/^[A-Z]{3}$/);
const optionSchema = z.object({ id: z.uuid(), name: z.string() });

export const catalogFilterOptionsResponseSchema = z.object({
  data: z.object({
    brands: z.array(optionSchema),
    categories: z.array(optionSchema),
    currencies: z.array(
      z.object({
        code: currencySchema,
        minimumPrice: moneySchema,
        maximumPrice: moneySchema,
      }),
    ),
  }),
  meta: z.object({ truncated: z.boolean() }),
});

const catalogListingSchema = z.object({
  id: z.uuid(),
  condition: z.enum(listingConditions),
  price: moneySchema,
  currency: currencySchema,
  inStock: z.boolean(),
});

const catalogVariantSchema = z.object({
  id: z.uuid(),
  sku: z.string(),
  manufacturerPartNumber: z.string(),
  oemNumber: z.string().nullable(),
  listings: z.array(catalogListingSchema),
});

export const catalogResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      description: z.string().nullable(),
      brand: optionSchema,
      category: optionSchema.nullable(),
      minimumPrice: z
        .object({ amount: moneySchema, currency: currencySchema })
        .nullable(),
      variants: z.array(catalogVariantSchema),
    }),
  ),
  meta: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().min(1).max(50),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
    sort: z.enum(catalogSorts),
  }),
});

export type CatalogFilterOptionsResponse = z.infer<
  typeof catalogFilterOptionsResponseSchema
>;
export type CatalogResponse = z.infer<typeof catalogResponseSchema>;
export type CatalogProduct = CatalogResponse["data"][number];
