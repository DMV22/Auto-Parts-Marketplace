import { z } from "zod";
import { orderStatusSchema } from "./checkout-types";
import {
  commerceCurrencySchema,
  commerceMoneySchema,
} from "./commerce-schemas";

const pageInfoSchema = z.object({
  nextCursor: z.string().nullable(),
  hasNextPage: z.boolean(),
});

const orderSummarySchema = z.object({
  orderId: z.uuid(),
  status: orderStatusSchema,
  currency: commerceCurrencySchema,
  totalAmount: commerceMoneySchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const orderItemSnapshotSchema = z.object({
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
});

export const orderHistoryResponseSchema = z.object({
  data: z.array(
    orderSummarySchema.extend({ itemCount: z.number().int().nonnegative() }),
  ),
  pageInfo: pageInfoSchema,
});

export const orderDetailResponseSchema = z.object({
  data: orderSummarySchema.extend({ items: z.array(orderItemSnapshotSchema) }),
});

export type OrderDetail = z.infer<typeof orderDetailResponseSchema>["data"];
export type OrderItemSnapshot = OrderDetail["items"][number];
export type OrderHistoryResponse = z.infer<typeof orderHistoryResponseSchema>;
export type OrderHistoryItem = OrderHistoryResponse["data"][number];

export const orderTimelineReasonCodes = [
  "ORDER_CREATED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_FAILED",
  "CHECKOUT_EXPIRED",
  "CHECKOUT_FAILED",
  "STATUS_UPDATED",
] as const;

export type OrderTimelineReasonCode =
  (typeof orderTimelineReasonCodes)[number];

export const orderTimelineResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.uuid(),
      previousStatus: orderStatusSchema.nullable(),
      status: orderStatusSchema,
      reasonCode: z.enum(orderTimelineReasonCodes),
      occurredAt: z.iso.datetime(),
    }),
  ),
  pageInfo: pageInfoSchema,
});

export type OrderTimelineResponse = z.infer<
  typeof orderTimelineResponseSchema
>;
export type OrderTimelineItem = OrderTimelineResponse["data"][number];
