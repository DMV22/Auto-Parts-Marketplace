import { z } from "zod";
import {
  commerceCurrencySchema,
  commerceMoneySchema,
} from "@/lib/commerce/commerce-schemas";

const supplierPriceSchema = z
  .string()
  .regex(/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/);

export const supplierMembershipResponseSchema = z.object({
  data: z
    .object({
      status: z.enum(["ACTIVE", "DISABLED"]),
      supplier: z.object({
        id: z.uuid(),
        name: z.string(),
        slug: z.string(),
      }),
    })
    .nullable(),
});

export const listingStatusSchema = z.enum([
  "DRAFT",
  "PENDING_APPROVAL",
  "ACTIVE",
  "PAUSED",
  "REJECTED",
  "ARCHIVED",
]);
export const listingConditionSchema = z.enum([
  "NEW",
  "USED",
  "REMANUFACTURED",
]);

export const supplierProductVariantSchema = z.object({
  id: z.uuid(),
  sku: z.string(),
  manufacturerPartNumber: z.string(),
  oemNumber: z.string().nullable(),
  product: z.object({
    id: z.uuid(),
    name: z.string(),
    brand: z.object({ id: z.uuid(), name: z.string() }),
    category: z.object({ id: z.uuid(), name: z.string() }).nullable(),
  }),
});

export const supplierProductVariantsResponseSchema = z.object({
  data: z.array(supplierProductVariantSchema),
  pageInfo: z.object({
    nextCursor: z.string().nullable(),
    hasNextPage: z.boolean(),
  }),
});

export const supplierProductVariantDetailResponseSchema = z.object({
  data: supplierProductVariantSchema,
});

export const supplierListingSchema = z.object({
  id: z.uuid(),
  supplierId: z.uuid(),
  status: listingStatusSchema,
  condition: listingConditionSchema,
  price: supplierPriceSchema,
  currency: commerceCurrencySchema,
  stockQuantity: z.number().int().nonnegative(),
  inventoryVersion: z.number().int().nonnegative(),
  rejectionReason: z.string().nullable(),
  moderationReason: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  productVariant: z.object({
    id: z.uuid(),
    sku: z.string(),
    manufacturerPartNumber: z.string(),
    oemNumber: z.string().nullable(),
  }),
});

export const supplierListingsResponseSchema = z.object({
  data: z.array(supplierListingSchema),
  meta: z.object({
    pageSize: z.number().int().positive(),
    nextCursor: z.string().nullable(),
    sort: z.enum(["updated_desc", "updated_asc", "price_asc", "price_desc"]),
  }),
});

const orderStatusSchema = z.enum([
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);

export const supplierOrderItemSchema = z.object({
  id: z.uuid(),
  orderId: z.uuid(),
  listingId: z.uuid(),
  productName: z.string().nullable(),
  sku: z.string().nullable(),
  manufacturerPartNumber: z.string().nullable(),
  condition: listingConditionSchema.nullable(),
  quantity: z.number().int().positive(),
  unitPrice: commerceMoneySchema,
  lineTotal: commerceMoneySchema,
  currency: commerceCurrencySchema,
  orderStatus: orderStatusSchema,
  orderedAt: z.iso.datetime(),
  orderUpdatedAt: z.iso.datetime(),
});

export const supplierOrderItemsResponseSchema = z.object({
  data: z.array(supplierOrderItemSchema),
  meta: z.object({
    pageSize: z.number().int().positive(),
    nextCursor: z.string().nullable(),
    hasNextPage: z.boolean(),
  }),
});

export type SupplierMembershipResponse = z.infer<
  typeof supplierMembershipResponseSchema
>;
export type SupplierProductVariant = z.infer<
  typeof supplierProductVariantSchema
>;
export type SupplierListing = z.infer<typeof supplierListingSchema>;
export type ListingStatus = z.infer<typeof listingStatusSchema>;
export type ListingCondition = z.infer<typeof listingConditionSchema>;
export type SupplierListingSort = z.infer<
  typeof supplierListingsResponseSchema
>["meta"]["sort"];
export type SupplierOrderItem = z.infer<typeof supplierOrderItemSchema>;

export type SupplierListingInput = {
  productVariantId: string;
  condition: ListingCondition;
  price: string;
  currency: string;
};

export type SupplierListingAction = "submit" | "pause" | "resume" | "archive";
export type SupplierListingsQuery = {
  status?: ListingStatus;
  condition?: ListingCondition;
  sort?: SupplierListingSort;
  cursor?: string;
  pageSize?: number;
};
export type SupplierOrderItemsQuery = {
  status?: z.infer<typeof orderStatusSchema>;
  createdFrom?: string;
  createdTo?: string;
  cursor?: string;
  pageSize?: number;
};
