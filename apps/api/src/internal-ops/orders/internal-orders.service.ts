/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  OrderStatus,
  OrderStatusEventSource,
  type UserRole,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { projectOrderTimelineItem } from '../../commerce/orders/order-timeline';
import type {
  OrdersPaginationQuery,
  OrderTimelineItem,
} from '../../commerce/orders/orders.types';
import { encodeOrderCursor } from '../../commerce/orders/orders.validation';
import { resolveInternalOrderTransition } from '../policies/order-transition.policy';
import type {
  InternalOrderDetail,
  InternalOrderListItem,
  InternalOrdersQuery,
  InternalOrdersResponse,
  InternalOrderTimelineResponse,
  InternalOrderTransitionCommand,
  InternalOrderTransitionResult,
  InternalPaymentOutcome,
} from './internal-orders.types';
import { encodeInternalOrderCursor } from './internal-orders.validation';
import { deriveInternalPaymentOutcome } from './internal-order-payment';

const PAID_LIFECYCLE = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
] as const;
const FAILED_EVENT_TYPES = [
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
] as const;
const FAILURE_EVENT_WHERE = {
  OR: [
    { source: OrderStatusEventSource.SYSTEM },
    {
      source: OrderStatusEventSource.STRIPE_WEBHOOK,
      paymentEvent: { is: { eventType: { in: [...FAILED_EVENT_TYPES] } } },
    },
  ],
} satisfies Prisma.OrderStatusEventWhereInput;

const LIST_SELECT = {
  id: true,
  status: true,
  currency: true,
  totalAmount: true,
  customerId: true,
  customer: { select: { name: true } },
  createdAt: true,
  updatedAt: true,
  _count: { select: { items: true } },
  statusEvents: {
    where: FAILURE_EVENT_WHERE,
    take: 1,
    select: { id: true },
  },
} satisfies Prisma.OrderSelect;

const DETAIL_SELECT = {
  id: true,
  status: true,
  currency: true,
  totalAmount: true,
  customerId: true,
  customer: { select: { id: true, name: true, email: true } },
  createdAt: true,
  updatedAt: true,
  statusEvents: {
    where: FAILURE_EVENT_WHERE,
    take: 1,
    select: { id: true },
  },
  items: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      listingId: true,
      productName: true,
      sku: true,
      manufacturerPartNumber: true,
      condition: true,
      supplierName: true,
      unitPrice: true,
      quantity: true,
    },
  },
} satisfies Prisma.OrderSelect;

@Injectable()
export class InternalOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: InternalOrdersQuery): Promise<InternalOrdersResponse> {
    const baseWhere = listWhere(query);
    if (query.cursor && !(await this.isOrderCursor(baseWhere, query.cursor))) {
      return emptyPage<InternalOrderListItem>();
    }

    const orders = await this.prisma.order.findMany({
      where: {
        ...baseWhere,
        ...(query.cursor ? { OR: afterCursor(query.cursor) } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      select: LIST_SELECT,
    });
    const hasNextPage = orders.length > query.limit;
    const page = orders.slice(0, query.limit);

    return {
      data: page.map(projectListItem),
      pageInfo: pageInfo(page, hasNextPage, encodeInternalOrderCursor),
    };
  }

  async detail(orderId: string): Promise<InternalOrderDetail> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: DETAIL_SELECT,
    });
    if (!order) throw orderNotFound();

    return {
      orderId: order.id,
      status: order.status,
      paymentOutcome: deriveInternalPaymentOutcome(
        order.status,
        order.statusEvents.length > 0,
      ),
      customer: order.customer
        ? {
            type: 'CUSTOMER',
            id: order.customer.id,
            name: order.customer.name,
            email: order.customer.email,
          }
        : { type: 'GUEST' },
      currency: order.currency,
      totalAmount: order.totalAmount.toFixed(2),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      items: order.items.map((item) => ({
        id: item.id,
        listingId: item.listingId,
        productName: item.productName,
        sku: item.sku,
        manufacturerPartNumber: item.manufacturerPartNumber,
        condition: item.condition,
        supplierName: item.supplierName,
        unitPrice: item.unitPrice.toFixed(2),
        quantity: item.quantity,
        lineTotal: item.unitPrice.mul(item.quantity).toFixed(2),
      })),
    };
  }

  async timeline(
    orderId: string,
    query: OrdersPaginationQuery,
  ): Promise<InternalOrderTimelineResponse> {
    if (
      !(await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true },
      }))
    ) {
      throw orderNotFound();
    }
    if (query.cursor && !(await this.isTimelineCursor(orderId, query.cursor))) {
      return emptyPage<OrderTimelineItem>();
    }

    const events = await this.prisma.orderStatusEvent.findMany({
      where: {
        orderId,
        ...(query.cursor ? { OR: afterCursor(query.cursor) } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      select: {
        id: true,
        fromStatus: true,
        toStatus: true,
        source: true,
        createdAt: true,
        paymentEvent: { select: { eventType: true } },
      },
    });
    const hasNextPage = events.length > query.limit;
    const page = events.slice(0, query.limit);
    return {
      data: page.map(projectOrderTimelineItem),
      pageInfo: pageInfo(page, hasNextPage, encodeOrderCursor),
    };
  }

  async transition(
    orderId: string,
    command: InternalOrderTransitionCommand,
    actor: { id: string; role: UserRole },
  ): Promise<InternalOrderTransitionResult> {
    return this.prisma.$transaction(async (transaction) => {
      const order = await transaction.order.findUnique({
        where: { id: orderId },
        select: { id: true, status: true },
      });
      if (!order) throw orderNotFound();

      const target = resolveInternalOrderTransition(
        order.status,
        command.targetStatus,
        actor.role,
      );
      const updated = await transaction.order.updateMany({
        where: { id: order.id, status: order.status },
        data: { status: target },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Order status changed concurrently');
      }

      const event = await transaction.orderStatusEvent.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: target,
          source: OrderStatusEventSource.INTERNAL_OPS,
        },
        select: { createdAt: true },
      });
      await transaction.activityLog.create({
        data: {
          actorUserId: actor.id,
          actorRole: actor.role,
          resourceType: 'ORDER',
          resourceId: order.id,
          action: 'ORDER_STATUS_CHANGED',
          previousStatus: order.status,
          newStatus: target,
          reason: command.reason,
        },
      });

      return {
        orderId: order.id,
        previousStatus: order.status,
        status: target,
        occurredAt: event.createdAt.toISOString(),
      };
    });
  }

  private async isOrderCursor(
    where: Prisma.OrderWhereInput,
    cursor: { id: string; createdAt: Date },
  ): Promise<boolean> {
    return !!(await this.prisma.order.findFirst({
      where: { ...where, id: cursor.id, createdAt: cursor.createdAt },
      select: { id: true },
    }));
  }

  private async isTimelineCursor(
    orderId: string,
    cursor: { id: string; createdAt: Date },
  ): Promise<boolean> {
    return !!(await this.prisma.orderStatusEvent.findFirst({
      where: { id: cursor.id, orderId, createdAt: cursor.createdAt },
      select: { id: true },
    }));
  }
}

function projectListItem(
  order: Prisma.OrderGetPayload<{ select: typeof LIST_SELECT }>,
): InternalOrderListItem {
  return {
    orderId: order.id,
    status: order.status,
    paymentOutcome: deriveInternalPaymentOutcome(
      order.status,
      order.statusEvents.length > 0,
    ),
    customerType: order.customerId ? 'CUSTOMER' : 'GUEST',
    customerName: order.customer?.name ?? null,
    currency: order.currency,
    totalAmount: order.totalAmount.toFixed(2),
    itemCount: order._count.items,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

function listWhere(query: InternalOrdersQuery): Prisma.OrderWhereInput {
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(query.paymentOutcome ? paymentOutcomeWhere(query.paymentOutcome) : {}),
    ...(query.createdFrom || query.createdTo
      ? {
          createdAt: {
            ...(query.createdFrom ? { gte: query.createdFrom } : {}),
            ...(query.createdTo ? { lte: query.createdTo } : {}),
          },
        }
      : {}),
  };
}

function paymentOutcomeWhere(
  outcome: InternalPaymentOutcome,
): Prisma.OrderWhereInput {
  if (outcome === 'PENDING') return { status: OrderStatus.PENDING_PAYMENT };
  if (outcome === 'PAID') return { status: { in: [...PAID_LIFECYCLE] } };
  if (outcome === 'FAILED_OR_EXPIRED') {
    return {
      status: OrderStatus.CANCELLED,
      statusEvents: { some: FAILURE_EVENT_WHERE },
    };
  }
  return {
    status: OrderStatus.CANCELLED,
    statusEvents: { none: FAILURE_EVENT_WHERE },
  };
}

function afterCursor(cursor: { id: string; createdAt: Date }) {
  return [
    { createdAt: { lt: cursor.createdAt } },
    { createdAt: cursor.createdAt, id: { lt: cursor.id } },
  ];
}

function pageInfo<T extends { id: string; createdAt: Date }>(
  page: T[],
  hasNextPage: boolean,
  encode: (input: { id: string; createdAt: Date }) => string,
) {
  const last = page.at(-1);
  return {
    nextCursor: hasNextPage && last ? encode(last) : null,
    hasNextPage,
  };
}

function emptyPage<T>(): {
  data: T[];
  pageInfo: { nextCursor: null; hasNextPage: false };
} {
  return { data: [], pageInfo: { nextCursor: null, hasNextPage: false } };
}

function orderNotFound(): NotFoundException {
  return new NotFoundException('Order not found');
}
