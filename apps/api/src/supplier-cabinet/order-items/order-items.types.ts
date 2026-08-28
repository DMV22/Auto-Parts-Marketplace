import type {
  ListingCondition,
  OrderStatus,
} from '../../generated/prisma/enums';

export type SupplierOrderItemCursor = {
  version: 1;
  orderCreatedAt: Date;
  orderItemId: string;
};

export type SupplierOrderItemsQuery = {
  status: OrderStatus | null;
  createdFrom: Date | null;
  createdTo: Date | null;
  cursor: SupplierOrderItemCursor | null;
  pageSize: number;
};

export type SupplierOrderItemDto = {
  id: string;
  orderId: string;
  listingId: string;
  productName: string | null;
  sku: string | null;
  manufacturerPartNumber: string | null;
  condition: ListingCondition | null;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  currency: string;
  orderStatus: OrderStatus;
  orderedAt: string;
  orderUpdatedAt: string;
};

export type SupplierOrderItemsResponse = {
  data: SupplierOrderItemDto[];
  meta: {
    pageSize: number;
    nextCursor: string | null;
    hasNextPage: boolean;
  };
};
