import { z } from "zod";
import {
  commerceCurrencySchema,
  commerceMoneySchema,
} from "./commerce-schemas";

export const orderStatuses = [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export const orderStatusSchema = z.enum(orderStatuses);

export const checkoutSessionResponseSchema = z.object({
  data: z.object({
    orderId: z.uuid(),
    status: orderStatusSchema,
    currency: commerceCurrencySchema,
    totalAmount: commerceMoneySchema,
    checkoutExpiresAt: z.iso.datetime(),
    checkoutSession: z
      .object({
        id: z.string().min(1),
        url: z.url(),
      })
      .nullable(),
  }),
});

export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type CheckoutSessionView = z.infer<
  typeof checkoutSessionResponseSchema
>["data"];
