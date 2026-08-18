import {
  OrderStatus,
  type OrderStatus as OrderStatusValue,
  OrderStatusEventSource,
  type OrderStatusEventSource as OrderStatusEventSourceValue,
} from '../../generated/prisma/enums';
import type {
  OrderTimelineItem,
  OrderTimelineReasonCode,
} from './orders.types';

export type TimelineProjectionSource = {
  id: string;
  fromStatus: OrderStatusValue | null;
  toStatus: OrderStatusValue;
  source: OrderStatusEventSourceValue;
  createdAt: Date;
  paymentEvent: { eventType: string } | null;
};

export function projectOrderTimelineItem(
  event: TimelineProjectionSource,
): OrderTimelineItem {
  return {
    id: event.id,
    previousStatus: event.fromStatus,
    status: event.toStatus,
    reasonCode: timelineReason(event),
    occurredAt: event.createdAt.toISOString(),
  };
}

function timelineReason(
  event: Omit<TimelineProjectionSource, 'id' | 'createdAt'>,
): OrderTimelineReasonCode {
  if (event.fromStatus === null) return 'ORDER_CREATED';
  if (event.toStatus === OrderStatus.PAID) return 'PAYMENT_CONFIRMED';
  if (event.paymentEvent?.eventType === 'checkout.session.expired') {
    return 'CHECKOUT_EXPIRED';
  }
  if (
    event.paymentEvent?.eventType === 'checkout.session.async_payment_failed'
  ) {
    return 'PAYMENT_FAILED';
  }
  if (
    event.toStatus === OrderStatus.CANCELLED &&
    event.source === OrderStatusEventSource.SYSTEM
  ) {
    return 'CHECKOUT_FAILED';
  }
  return 'STATUS_UPDATED';
}
