import type { OrderStatus } from '../../generated/prisma/enums';

export type CheckoutSessionView = {
  orderId: string;
  status: OrderStatus;
  currency: string;
  totalAmount: string;
  checkoutExpiresAt: string;
  checkoutSession: {
    id: string;
    url: string;
  } | null;
};

export type CheckoutSessionResponse = { data: CheckoutSessionView };
