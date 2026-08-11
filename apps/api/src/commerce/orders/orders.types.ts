import type {
  ListingCondition,
  OrderStatus,
} from '../../generated/prisma/enums';

export type OrderCursor = {
  id: string;
  createdAt: Date;
};

export type OrdersPaginationQuery = {
  limit: number;
  cursor: OrderCursor | null;
};

export type PageInfo = {
  nextCursor: string | null;
  hasNextPage: boolean;
};

export type OrderHistoryItem = {
  id: string;
  status: OrderStatus;
  currency: string;
  totalAmount: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type OrderItemSnapshot = {
  id: string;
  listingId: string;
  productName: string | null;
  sku: string | null;
  manufacturerPartNumber: string | null;
  condition: ListingCondition | null;
  supplierName: string | null;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
};

export type OrderDetail = Omit<OrderHistoryItem, 'itemCount'> & {
  items: OrderItemSnapshot[];
};

export type OrderTimelineReasonCode =
  | 'ORDER_CREATED'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_FAILED'
  | 'CHECKOUT_EXPIRED'
  | 'CHECKOUT_FAILED'
  | 'STATUS_UPDATED';

export type OrderTimelineItem = {
  id: string;
  previousStatus: OrderStatus | null;
  status: OrderStatus;
  reasonCode: OrderTimelineReasonCode;
  occurredAt: string;
};

export type OrderHistoryResponse = {
  data: OrderHistoryItem[];
  pageInfo: PageInfo;
};

export type OrderDetailResponse = { data: OrderDetail };

export type OrderTimelineResponse = {
  data: OrderTimelineItem[];
  pageInfo: PageInfo;
};
