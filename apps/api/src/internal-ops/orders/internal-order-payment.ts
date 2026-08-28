import {
  OrderStatus,
  type OrderStatus as OrderStatusValue,
} from '../../generated/prisma/enums';
import type { InternalPaymentOutcome } from './internal-orders.types';

const PAID_LIFECYCLE = new Set<OrderStatusValue>([
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
]);

export function deriveInternalPaymentOutcome(
  status: OrderStatusValue,
  hasPaymentFailureEvidence: boolean,
): InternalPaymentOutcome {
  if (status === OrderStatus.PENDING_PAYMENT) return 'PENDING';
  if (PAID_LIFECYCLE.has(status)) return 'PAID';
  return hasPaymentFailureEvidence ? 'FAILED_OR_EXPIRED' : 'NOT_APPLICABLE';
}
