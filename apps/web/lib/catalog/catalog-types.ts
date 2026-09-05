import { z } from "zod";
import { catalogSorts, listingConditions } from "./catalog-query";

const moneySchema = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/);
const currencySchema = z.string().regex(/^[A-Z]{3}$/);
const optionSchema = z.object({ id: z.uuid(), name: z.string() });

export const catalogFilterOptionsResponseSchema = z.object({
  data: z.object({
    brands: z.array(optionSchema),
    categories: z.array(optionSchema),
    defaultCurrency: currencySchema.nullable(),
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

export const fitmentStatuses = [
  "compatible",
  "incompatible",
  "unknown",
  "caution",
] as const;

export const fitmentReasonCodes = [
  "VEHICLE_NOT_SELECTED",
  "EXACT_ENGINE_MATCH",
  "EXACT_ENGINE_EXCLUSION",
  "GENERATION_MATCH",
  "GENERATION_EXCLUSION",
  "ENGINE_REQUIRED",
  "NO_FITMENT_DATA",
] as const;

const fitmentAnswerSchema = z.object({
  status: z.enum(fitmentStatuses),
  reasonCode: z.enum(fitmentReasonCodes),
  matchedRule: z
    .object({
      id: z.uuid(),
      effect: z.enum(["COMPATIBLE", "INCOMPATIBLE"]),
      scope: z.enum(["ENGINE", "GENERATION"]),
      vehicleGenerationId: z.uuid(),
      engineTypeId: z.uuid().nullable(),
    })
    .nullable(),
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

export const productDetailResponseSchema = z.object({
  data: z.object({
    id: z.uuid(),
    name: z.string(),
    description: z.string().nullable(),
    brand: optionSchema,
    category: optionSchema.nullable(),
    variants: z.array(
      z.object({
        id: z.uuid(),
        sku: z.string(),
        manufacturerPartNumber: z.string(),
        oemNumber: z.string().nullable(),
        fitment: fitmentAnswerSchema,
        listings: z.array(
          catalogListingSchema.extend({
            supplier: z.object({
              id: z.uuid(),
              name: z.string(),
              slug: z.string(),
            }),
          }),
        ),
      }),
    ),
  }),
});

export type CatalogFilterOptionsResponse = z.infer<
  typeof catalogFilterOptionsResponseSchema
>;
export type CatalogResponse = z.infer<typeof catalogResponseSchema>;
export type CatalogProduct = CatalogResponse["data"][number];
export type ProductDetailResponse = z.infer<typeof productDetailResponseSchema>;
export type ProductDetail = ProductDetailResponse["data"];
export type ProductVariantDetail = ProductDetail["variants"][number];
export type FitmentAnswer = ProductVariantDetail["fitment"];
export type FitmentStatus = (typeof fitmentStatuses)[number];
export type FitmentReasonCode = (typeof fitmentReasonCodes)[number];
