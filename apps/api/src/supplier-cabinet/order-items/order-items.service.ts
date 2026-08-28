/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  SupplierOrderItemCursor,
  SupplierOrderItemDto,
  SupplierOrderItemsQuery,
  SupplierOrderItemsResponse,
} from './order-items.types';
import { encodeSupplierOrderItemCursor } from './order-items.validation';

const SUPPLIER_ORDER_ITEM_SELECT = {
  id: true,
  orderId: true,
  listingId: true,
  productName: true,
  sku: true,
  manufacturerPartNumber: true,
  condition: true,
  quantity: true,
  unitPrice: true,
  order: {
    select: {
      status: true,
      currency: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.OrderItemSelect;

type SupplierOrderItemRecord = Prisma.OrderItemGetPayload<{
  select: typeof SUPPLIER_ORDER_ITEM_SELECT;
}>;

@Injectable()
export class SupplierOrderItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    supplierId: string,
    query: SupplierOrderItemsQuery,
  ): Promise<SupplierOrderItemsResponse> {
    if (query.cursor && !(await this.isOwnedCursor(supplierId, query.cursor))) {
      return emptyPage(query.pageSize);
    }

    const items = await this.prisma.orderItem.findMany({
      where: {
        listing: { supplierId },
        order: orderWhere(query),
        ...(query.cursor ? { OR: afterCursor(query.cursor) } : {}),
      },
      orderBy: [{ order: { createdAt: 'desc' } }, { id: 'desc' }],
      take: query.pageSize + 1,
      select: SUPPLIER_ORDER_ITEM_SELECT,
    });
    const hasNextPage = items.length > query.pageSize;
    const page = items.slice(0, query.pageSize);
    const last = page.at(-1);

    return {
      data: page.map(mapSupplierOrderItem),
      meta: {
        pageSize: query.pageSize,
        hasNextPage,
        nextCursor:
          hasNextPage && last
            ? encodeSupplierOrderItemCursor({
                version: 1,
                orderCreatedAt: last.order.createdAt,
                orderItemId: last.id,
              })
            : null,
      },
    };
  }

  async detail(
    supplierId: string,
    orderItemId: string,
  ): Promise<SupplierOrderItemDto> {
    const item = await this.prisma.orderItem.findFirst({
      where: { id: orderItemId, listing: { supplierId } },
      select: SUPPLIER_ORDER_ITEM_SELECT,
    });
    if (!item) throw new NotFoundException('Order item not found');
    return mapSupplierOrderItem(item);
  }

  private async isOwnedCursor(
    supplierId: string,
    cursor: SupplierOrderItemCursor,
  ): Promise<boolean> {
    const anchor = await this.prisma.orderItem.findFirst({
      where: {
        id: cursor.orderItemId,
        listing: { supplierId },
        order: { createdAt: cursor.orderCreatedAt },
      },
      select: { id: true },
    });
    return !!anchor;
  }
}

function orderWhere(query: SupplierOrderItemsQuery): Prisma.OrderWhereInput {
  return {
    ...(query.status ? { status: query.status } : {}),
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

function afterCursor(cursor: SupplierOrderItemCursor): Prisma.OrderItemWhereInput[] {
  return [
    { order: { createdAt: { lt: cursor.orderCreatedAt } } },
    {
      order: { createdAt: cursor.orderCreatedAt },
      id: { lt: cursor.orderItemId },
    },
  ];
}

function mapSupplierOrderItem(
  item: SupplierOrderItemRecord,
): SupplierOrderItemDto {
  return {
    id: item.id,
    orderId: item.orderId,
    listingId: item.listingId,
    productName: item.productName,
    sku: item.sku,
    manufacturerPartNumber: item.manufacturerPartNumber,
    condition: item.condition,
    quantity: item.quantity,
    unitPrice: item.unitPrice.toFixed(2),
    lineTotal: item.unitPrice.mul(item.quantity).toFixed(2),
    currency: item.order.currency,
    orderStatus: item.order.status,
    orderedAt: item.order.createdAt.toISOString(),
    orderUpdatedAt: item.order.updatedAt.toISOString(),
  };
}

function emptyPage(pageSize: number): SupplierOrderItemsResponse {
  return {
    data: [],
    meta: { pageSize, nextCursor: null, hasNextPage: false },
  };
}
