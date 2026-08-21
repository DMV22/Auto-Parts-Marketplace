import { z } from "zod";

export const returnRequestStatuses = [
  "REQUESTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "RECEIVED",
  "COMPLETED",
  "CANCELLED",
] as const;

export const returnRequestStatusSchema = z.enum(returnRequestStatuses);

export const customerReturnSchema = z.object({
  id: z.uuid(),
  orderId: z.uuid(),
  orderItemId: z.uuid(),
  status: returnRequestStatusSchema,
  reason: z.string(),
  decisionReason: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const customerReturnsResponseSchema = z.object({
  data: z.array(customerReturnSchema),
});

export const customerReturnResponseSchema = z.object({
  data: customerReturnSchema,
});

export const returnTransitionResponseSchema = z.object({
  data: z.object({
    id: z.uuid(),
    previousStatus: returnRequestStatusSchema,
    status: returnRequestStatusSchema,
    updatedAt: z.iso.datetime(),
  }),
});

export type ReturnRequestStatus = z.infer<typeof returnRequestStatusSchema>;
export type CustomerReturn = z.infer<typeof customerReturnSchema>;
export type CustomerReturnsResponse = z.infer<
  typeof customerReturnsResponseSchema
>;
export type ReturnTransition = z.infer<
  typeof returnTransitionResponseSchema
>["data"];
