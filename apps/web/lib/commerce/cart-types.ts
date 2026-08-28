import { z } from "zod";
import {
  commerceCurrencySchema,
  commerceMoneySchema,
} from "./commerce-schemas";

export const cartAvailabilityIssues = [
  "LISTING_UNAVAILABLE",
  "INSUFFICIENT_STOCK",
  "CURRENCY_MISMATCH",
] as const;

const cartItemSchema = z.object({
  id: z.uuid(),
  quantity: z.number().int().positive(),
  unitPrice: commerceMoneySchema,
  lineTotal: commerceMoneySchema,
  available: z.boolean(),
  issues: z.array(z.enum(cartAvailabilityIssues)),
  listing: z.object({
    id: z.uuid(),
    condition: z.enum(["NEW", "USED", "REMANUFACTURED"]),
    currency: commerceCurrencySchema,
    inStock: z.boolean(),
    productVariant: z.object({
      id: z.uuid(),
      sku: z.string(),
      product: z.object({ id: z.uuid(), name: z.string() }),
    }),
    supplier: z.object({
      id: z.uuid(),
      name: z.string(),
      slug: z.string(),
    }),
  }),
});

export const cartResponseSchema = z.object({
  data: z.object({
    id: z.uuid().nullable(),
    currency: commerceCurrencySchema.nullable(),
    totalQuantity: z.number().int().nonnegative(),
    totalAmount: commerceMoneySchema,
    items: z.array(cartItemSchema),
  }),
});

export type CartAvailabilityIssue =
  (typeof cartAvailabilityIssues)[number];
export type CartResponse = z.infer<typeof cartResponseSchema>;
export type CartView = CartResponse["data"];
export type CartItemView = CartView["items"][number];
