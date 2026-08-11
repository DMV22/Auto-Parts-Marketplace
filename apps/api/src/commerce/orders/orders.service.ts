/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  OrderStatus,
  OrderStatusEventSource,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import type { CommerceActor } from '../commerce.types';
import type {
  OrderDetail,
  OrderCursor,
  OrderHistoryItem,
  OrderHistoryResponse,
  OrdersPaginationQuery,
  OrderTimelineItem,
  OrderTimelineReasonCode,
  OrderTimelineResponse,
} from './orders.types';
import { encodeOrderCursor } from './orders.validation';

const ORDER_HISTORY_SELECT = {
  id: true,
  status: true,
  currency: true,
  totalAmount: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { items: true } },
} satisfies Prisma.OrderSelect;

const ORDER_DETAIL_SELECT = {
  id: true,
  status: true,
  currency: true,
  totalAmount: true,
  createdAt: true,
  updatedAt: true,
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
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    actor: CommerceActor,
    query: OrdersPaginationQuery,
  ): Promise<OrderHistoryResponse> {
    const owner = ownerWhere(actor);
    if (query.cursor && !(await this.isOwnerCursor(owner, query.cursor))) {
      return emptyPage<OrderHistoryItem>();
    }

    const orders = await this.prisma.order.findMany({
      where: {
        ...owner,
        ...(query.cursor ? { OR: afterCursor(query.cursor) } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      select: ORDER_HISTORY_SELECT,
    });
    const hasNextPage = orders.length > query.limit;
    const page = orders.slice(0, query.limit);

    return {
      data: page.map((order) => ({
        orderId: order.id,
        status: order.status,
        currency: order.currency,
        totalAmount: order.totalAmount.toFixed(2),
        itemCount: order._count.items,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      })),
      pageInfo: pageInfo(page, hasNextPage),
    };
  }

  async detail(actor: CommerceActor, orderId: string): Promise<OrderDetail> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, ...ownerWhere(actor) },
      select: ORDER_DETAIL_SELECT,
    });
    if (!order) throw orderNotFound();

    return {
      orderId: order.id,
      status: order.status,
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
    actor: CommerceActor,
    orderId: string,
    query: OrdersPaginationQuery,
  ): Promise<OrderTimelineResponse> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, ...ownerWhere(actor) },
      select: { id: true },
    });
    if (!order) throw orderNotFound();
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
      data: page.map((event) => ({
        id: event.id,
        previousStatus: event.fromStatus,
        status: event.toStatus,
        reasonCode: timelineReason(event),
        occurredAt: event.createdAt.toISOString(),
      })),
      pageInfo: pageInfo(page, hasNextPage),
    };
  }

  private async isOwnerCursor(
    owner: Prisma.OrderWhereInput,
    cursor: OrderCursor,
  ): Promise<boolean> {
    const anchor = await this.prisma.order.findFirst({
      where: { id: cursor.id, createdAt: cursor.createdAt, ...owner },
      select: { id: true },
    });
    return !!anchor;
  }

  private async isTimelineCursor(
    orderId: string,
    cursor: OrderCursor,
  ): Promise<boolean> {
    const anchor = await this.prisma.orderStatusEvent.findFirst({
      where: { id: cursor.id, orderId, createdAt: cursor.createdAt },
      select: { id: true },
    });
    return !!anchor;
  }
}

function ownerWhere(actor: CommerceActor): Prisma.OrderWhereInput {
  return actor.kind === 'CUSTOMER'
    ? { customerId: actor.customerId }
    : { guestTokenHash: actor.guestTokenHash };
}

function afterCursor(cursor: { id: string; createdAt: Date }) {
  return [
    { createdAt: { lt: cursor.createdAt } },
    { createdAt: cursor.createdAt, id: { lt: cursor.id } },
  ];
}

function pageInfo(
  page: Array<{ id: string; createdAt: Date }>,
  hasNextPage: boolean,
) {
  const last = page.at(-1);
  return {
    nextCursor:
      hasNextPage && last
        ? encodeOrderCursor({ id: last.id, createdAt: last.createdAt })
        : null,
    hasNextPage,
  };
}

function emptyPage<T>(): {
  data: T[];
  pageInfo: { nextCursor: null; hasNextPage: false };
} {
  return { data: [], pageInfo: { nextCursor: null, hasNextPage: false } };
}

function timelineReason(event: {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  source: OrderStatusEventSource;
  paymentEvent: { eventType: string } | null;
}): OrderTimelineReasonCode {
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

function orderNotFound(): NotFoundException {
  return new NotFoundException('Order not found');
}
