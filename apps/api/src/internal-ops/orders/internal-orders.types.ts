import type {
  ListingCondition,
  OrderStatus,
} from '../../generated/prisma/enums';
import type {
  OrderTimelineItem,
  PageInfo,
} from '../../commerce/orders/orders.types';

export type InternalPaymentOutcome =
  | 'PENDING'
  | 'PAID'
  | 'FAILED_OR_EXPIRED'
  | 'NOT_APPLICABLE';

export type InternalOrderCursor = {
  id: string;
  createdAt: Date;
};

export type InternalOrdersQuery = {
  status: OrderStatus | null;
  paymentOutcome: InternalPaymentOutcome | null;
  createdFrom: Date | null;
  createdTo: Date | null;
  limit: number;
  cursor: InternalOrderCursor | null;
};

export type InternalOrderTransitionCommand = {
  targetStatus: OrderStatus;
  reason: string | null;
};

export type InternalOrderListItem = {
  orderId: string;
  status: OrderStatus;
  paymentOutcome: InternalPaymentOutcome;
  customerType: 'CUSTOMER' | 'GUEST';
  customerName: string | null;
  currency: string;
  totalAmount: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type InternalOrderItemSnapshot = {
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

export type InternalOrderCustomer =
  | { type: 'CUSTOMER'; id: string; name: string; email: string }
  | { type: 'GUEST' };

export type InternalOrderDetail = Omit<
  InternalOrderListItem,
  'customerType' | 'customerName' | 'itemCount'
> & {
  customer: InternalOrderCustomer;
  items: InternalOrderItemSnapshot[];
};

export type InternalOrdersResponse = {
  data: InternalOrderListItem[];
  pageInfo: PageInfo;
};

export type InternalOrderDetailResponse = { data: InternalOrderDetail };

export type InternalOrderTransitionResult = {
  orderId: string;
  previousStatus: OrderStatus;
  status: OrderStatus;
  occurredAt: string;
};

export type InternalOrderTransitionResponse = {
  data: InternalOrderTransitionResult;
};

export type InternalOrderTimelineResponse = {
  data: OrderTimelineItem[];
  pageInfo: PageInfo;
};
