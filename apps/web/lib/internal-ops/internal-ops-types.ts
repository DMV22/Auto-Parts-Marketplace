import { z } from "zod";
import {
  commerceCurrencySchema,
  commerceMoneySchema,
} from "@/lib/commerce/commerce-schemas";
import {
  orderTimelineResponseSchema,
  type OrderTimelineResponse,
} from "@/lib/commerce/order-types";
import { supplierListingSchema } from "@/lib/supplier/supplier-types";

export const internalOrderStatusSchema = z.enum([
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);
export const internalPaymentOutcomeSchema = z.enum([
  "PENDING",
  "PAID",
  "FAILED_OR_EXPIRED",
  "NOT_APPLICABLE",
]);
export const returnRequestStatusSchema = z.enum([
  "REQUESTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "RECEIVED",
  "COMPLETED",
  "CANCELLED",
]);
export const activityResourceSchema = z.enum([
  "ORDER",
  "RETURN_REQUEST",
  "LISTING",
  "NOTE",
]);
const userRoleSchema = z.enum([
  "CUSTOMER",
  "SUPPLIER_USER",
  "SUPPORT_MANAGER",
  "ADMIN",
]);
const pageInfoSchema = z.object({
  nextCursor: z.string().nullable(),
  hasNextPage: z.boolean(),
});
const listingConditionSchema = z
  .enum(["NEW", "USED", "REMANUFACTURED"])
  .nullable();

const internalOrderListItemSchema = z.object({
  orderId: z.uuid(),
  status: internalOrderStatusSchema,
  paymentOutcome: internalPaymentOutcomeSchema,
  customerType: z.enum(["CUSTOMER", "GUEST"]),
  customerName: z.string().nullable(),
  currency: commerceCurrencySchema,
  totalAmount: commerceMoneySchema,
  itemCount: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const internalOrdersResponseSchema = z.object({
  data: z.array(internalOrderListItemSchema),
  pageInfo: pageInfoSchema,
});
export const internalOrderDetailResponseSchema = z.object({
  data: internalOrderListItemSchema
    .omit({ customerType: true, customerName: true, itemCount: true })
    .extend({
      customer: z.discriminatedUnion("type", [
        z.object({
          type: z.literal("CUSTOMER"),
          id: z.uuid(),
          name: z.string(),
          email: z.email(),
        }),
        z.object({ type: z.literal("GUEST") }),
      ]),
      items: z.array(
        z.object({
          id: z.uuid(),
          listingId: z.uuid(),
          productName: z.string().nullable(),
          sku: z.string().nullable(),
          manufacturerPartNumber: z.string().nullable(),
          condition: listingConditionSchema,
          supplierName: z.string().nullable(),
          unitPrice: commerceMoneySchema,
          quantity: z.number().int().positive(),
          lineTotal: commerceMoneySchema,
        }),
      ),
    }),
});
export const internalOrderTransitionResponseSchema = z.object({
  data: z.object({
    orderId: z.uuid(),
    previousStatus: internalOrderStatusSchema,
    status: internalOrderStatusSchema,
    occurredAt: z.iso.datetime(),
  }),
});

const internalReturnListItemSchema = z.object({
  id: z.uuid(),
  orderId: z.uuid(),
  orderItemId: z.uuid(),
  status: returnRequestStatusSchema,
  reason: z.string(),
  productName: z.string().nullable(),
  sku: z.string().nullable(),
  quantity: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const internalReturnsResponseSchema = z.object({
  data: z.array(internalReturnListItemSchema),
  pageInfo: pageInfoSchema,
});
export const internalReturnDetailResponseSchema = z.object({
  data: internalReturnListItemSchema.extend({
    decisionReason: z.string().nullable(),
    decidedAt: z.iso.datetime().nullable(),
    customer: z.discriminatedUnion("type", [
      z.object({
        type: z.literal("CUSTOMER"),
        id: z.uuid(),
        name: z.string(),
        email: z.email(),
      }),
      z.object({ type: z.literal("GUEST") }),
    ]),
  }),
});
export const returnTransitionResponseSchema = z.object({
  data: z.object({
    id: z.uuid(),
    previousStatus: returnRequestStatusSchema,
    status: returnRequestStatusSchema,
    updatedAt: z.iso.datetime(),
  }),
});

const noteTargetSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ORDER"), id: z.uuid() }),
  z.object({ type: z.literal("RETURN_REQUEST"), id: z.uuid() }),
]);
export const internalNoteSchema = z.object({
  id: z.uuid(),
  target: noteTargetSchema,
  author: z.object({ id: z.uuid(), name: z.string(), role: userRoleSchema }),
  body: z.string().nullable(),
  isRedacted: z.boolean(),
  correctsNoteId: z.uuid().nullable(),
  redactedAt: z.iso.datetime().nullable(),
  redactionReason: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export const internalNotesResponseSchema = z.object({
  data: z.array(internalNoteSchema),
  pageInfo: pageInfoSchema,
});
export const internalNoteResponseSchema = z.object({ data: internalNoteSchema });

export const activityResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.uuid(),
      actorUserId: z.uuid().nullable(),
      actorRole: userRoleSchema.nullable(),
      resourceType: activityResourceSchema,
      resourceId: z.uuid(),
      action: z.string(),
      previousStatus: z.string().nullable(),
      newStatus: z.string().nullable(),
      reason: z.string().nullable(),
      metadata: z
        .object({
          noteId: z.uuid().optional(),
          correctsNoteId: z.uuid().optional(),
        })
        .strict()
        .nullable(),
      createdAt: z.iso.datetime(),
    }),
  ),
  pageInfo: pageInfoSchema,
});

export const moderationResponseSchema = z.object({
  data: z.array(
    supplierListingSchema.extend({
      supplier: z.object({ id: z.uuid(), name: z.string() }),
    }),
  ),
  meta: z.object({
    pageSize: z.number().int().positive(),
    nextCursor: z.string().nullable(),
  }),
});

export { orderTimelineResponseSchema };
export type InternalOrderStatus = z.infer<typeof internalOrderStatusSchema>;
export type InternalPaymentOutcome = z.infer<
  typeof internalPaymentOutcomeSchema
>;
export type ReturnRequestStatus = z.infer<typeof returnRequestStatusSchema>;
export type ActivityResource = z.infer<typeof activityResourceSchema>;
export type InternalOrdersResponse = z.infer<typeof internalOrdersResponseSchema>;
export type InternalOrder = z.infer<typeof internalOrderDetailResponseSchema>["data"];
export type InternalOrderTimelineResponse = OrderTimelineResponse;
export type InternalReturnsResponse = z.infer<
  typeof internalReturnsResponseSchema
>;
export type InternalReturn = z.infer<typeof internalReturnDetailResponseSchema>["data"];
export type InternalNote = z.infer<typeof internalNoteSchema>;
export type InternalNotesResponse = z.infer<typeof internalNotesResponseSchema>;
export type ActivityResponse = z.infer<typeof activityResponseSchema>;
export type ModerationResponse = z.infer<typeof moderationResponseSchema>;

export type InternalOrdersQuery = {
  status?: InternalOrderStatus;
  paymentOutcome?: InternalPaymentOutcome;
  createdFrom?: string;
  createdTo?: string;
  cursor?: string;
  limit?: number;
};
export type InternalReturnsQuery = {
  status?: ReturnRequestStatus;
  createdFrom?: string;
  createdTo?: string;
  cursor?: string;
  limit?: number;
};
export type ActivityQuery = {
  actorId?: string;
  action?: string;
  resourceType?: ActivityResource;
  resourceId?: string;
  createdFrom?: string;
  createdTo?: string;
  cursor?: string;
  limit?: number;
};
export type ModerationQuery = {
  status?: z.infer<typeof supplierListingSchema>["status"];
  condition?: NonNullable<z.infer<typeof listingConditionSchema>>;
  supplierId?: string;
  createdFrom?: string;
  createdTo?: string;
  cursor?: string;
  pageSize?: number;
};
export type NoteTarget = z.infer<typeof noteTargetSchema>;
