import { z } from "zod";
import { orderStatusSchema } from "./checkout-types";
import {
  commerceCurrencySchema,
  commerceMoneySchema,
} from "./commerce-schemas";

export const orderDetailResponseSchema = z.object({
  data: z.object({
    orderId: z.uuid(),
    status: orderStatusSchema,
    currency: commerceCurrencySchema,
    totalAmount: commerceMoneySchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    items: z.array(
      z.object({
        id: z.uuid(),
        listingId: z.uuid(),
        productName: z.string().nullable(),
        sku: z.string().nullable(),
        manufacturerPartNumber: z.string().nullable(),
        condition: z.enum(["NEW", "USED", "REMANUFACTURED"]).nullable(),
        supplierName: z.string().nullable(),
        unitPrice: commerceMoneySchema,
        quantity: z.number().int().positive(),
        lineTotal: commerceMoneySchema,
      }),
    ),
  }),
});

export type OrderDetail = z.infer<typeof orderDetailResponseSchema>["data"];
