import type {
  ReturnRequestStatus,
  UserRole,
} from '../../generated/prisma/enums';
import type { PageInfo } from '../../commerce/orders/orders.types';

export type ReturnActor = { id: string; role: UserRole };

export type CreateReturnCommand = { reason: string };

export type ReturnTransitionCommand = {
  targetStatus: ReturnRequestStatus;
  reason: string | null;
};

export type ReturnCursor = { id: string; createdAt: Date };

export type InternalReturnsQuery = {
  status: ReturnRequestStatus | null;
  createdFrom: Date | null;
  createdTo: Date | null;
  limit: number;
  cursor: ReturnCursor | null;
};

export type CustomerReturnItem = {
  id: string;
  orderId: string;
  orderItemId: string;
  status: ReturnRequestStatus;
  reason: string;
  decisionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerReturnsResponse = { data: CustomerReturnItem[] };

export type InternalReturnListItem = {
  id: string;
  orderId: string;
  orderItemId: string;
  status: ReturnRequestStatus;
  reason: string;
  productName: string | null;
  sku: string | null;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};

export type InternalReturnCustomer =
  | { type: 'CUSTOMER'; id: string; name: string; email: string }
  | { type: 'GUEST' };

export type InternalReturnDetail = InternalReturnListItem & {
  decisionReason: string | null;
  decidedAt: string | null;
  customer: InternalReturnCustomer;
};

export type InternalReturnsResponse = {
  data: InternalReturnListItem[];
  pageInfo: PageInfo;
};

export type ReturnTransitionResult = {
  id: string;
  previousStatus: ReturnRequestStatus;
  status: ReturnRequestStatus;
  updatedAt: string;
};
