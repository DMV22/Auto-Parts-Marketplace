import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  ActivityResourceType,
  OrderStatus,
  ReturnRequestStatus,
  UserRole,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogService } from '../activity-log.service';
import { resolveReturnTransition } from '../policies/return-transition.policy';
import type {
  CreateReturnCommand,
  CustomerReturnItem,
  InternalReturnDetail,
  InternalReturnListItem,
  InternalReturnsQuery,
  InternalReturnsResponse,
  ReturnActor,
  ReturnTransitionCommand,
  ReturnTransitionResult,
} from './returns.types';
import { encodeReturnCursor } from './returns.validation';

const UNFINISHED_STATUSES = [
  ReturnRequestStatus.REQUESTED,
  ReturnRequestStatus.UNDER_REVIEW,
  ReturnRequestStatus.APPROVED,
  ReturnRequestStatus.RECEIVED,
] as const;

const RETURN_SELECT = {
  id: true,
  orderItemId: true,
  status: true,
  reason: true,
  decisionReason: true,
  decidedAt: true,
  createdAt: true,
  updatedAt: true,
  orderItem: {
    select: {
      orderId: true,
      productName: true,
      sku: true,
      quantity: true,
      order: {
        select: {
          customerId: true,
          customer: { select: { id: true, name: true, email: true } },
        },
      },
    },
  },
} satisfies Prisma.ReturnRequestSelect;

type SelectedReturn = Prisma.ReturnRequestGetPayload<{
  select: typeof RETURN_SELECT;
}>;

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  createForCustomer(
    orderId: string,
    orderItemId: string,
    command: CreateReturnCommand,
    actor: ReturnActor,
  ): Promise<CustomerReturnItem> {
    return this.create(orderId, orderItemId, command, actor, actor.id);
  }

  createForSupport(
    orderId: string,
    orderItemId: string,
    command: CreateReturnCommand,
    actor: ReturnActor,
  ): Promise<CustomerReturnItem> {
    return this.create(orderId, orderItemId, command, actor, null);
  }

  async listForCustomer(
    orderId: string,
    orderItemId: string,
    customerId: string,
  ): Promise<CustomerReturnItem[]> {
    await this.requireDeliveredOrderItem(orderId, orderItemId, customerId);
    const returns = await this.prisma.returnRequest.findMany({
      where: { orderItemId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: RETURN_SELECT,
    });
    return returns.map(projectCustomerReturn);
  }

  async cancelForCustomer(
    orderId: string,
    orderItemId: string,
    returnRequestId: string,
    actor: ReturnActor,
  ): Promise<ReturnTransitionResult> {
    return this.prisma.$transaction(async (transaction) => {
      const request = await transaction.returnRequest.findFirst({
        where: {
          id: returnRequestId,
          orderItemId,
          orderItem: { orderId, order: { customerId: actor.id } },
        },
        select: { id: true, status: true },
      });
      if (!request) throw returnNotFound();

      const target = resolveReturnTransition(
        request.status,
        ReturnRequestStatus.CANCELLED,
        UserRole.CUSTOMER,
      );
      await this.updateStatus(transaction, request.id, request.status, target);
      await this.activityLog.record(transaction, {
        actorUserId: actor.id,
        actorRole: actor.role,
        resourceType: ActivityResourceType.RETURN_REQUEST,
        resourceId: request.id,
        action: 'RETURN_REQUEST_CANCELLED',
        previousStatus: request.status,
        newStatus: target,
      });
      return this.transitionResult(transaction, request.id, request.status);
    });
  }

  async listInternal(
    query: InternalReturnsQuery,
  ): Promise<InternalReturnsResponse> {
    const baseWhere = internalWhere(query);
    if (query.cursor && !(await this.isCursor(baseWhere, query.cursor))) {
      return { data: [], pageInfo: { nextCursor: null, hasNextPage: false } };
    }
    const rows = await this.prisma.returnRequest.findMany({
      where: {
        ...baseWhere,
        ...(query.cursor ? { OR: afterCursor(query.cursor) } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      select: RETURN_SELECT,
    });
    const hasNextPage = rows.length > query.limit;
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return {
      data: page.map(projectInternalListItem),
      pageInfo: {
        hasNextPage,
        nextCursor:
          hasNextPage && last
            ? encodeReturnCursor({ id: last.id, createdAt: last.createdAt })
            : null,
      },
    };
  }

  async internalDetail(returnRequestId: string): Promise<InternalReturnDetail> {
    const request = await this.prisma.returnRequest.findUnique({
      where: { id: returnRequestId },
      select: RETURN_SELECT,
    });
    if (!request) throw returnNotFound();
    return projectInternalDetail(request);
  }

  async transitionInternal(
    returnRequestId: string,
    command: ReturnTransitionCommand,
    actor: ReturnActor,
  ): Promise<ReturnTransitionResult> {
    return this.prisma.$transaction(async (transaction) => {
      const request = await transaction.returnRequest.findUnique({
        where: { id: returnRequestId },
        select: { id: true, status: true },
      });
      if (!request) throw returnNotFound();
      const target = resolveReturnTransition(
        request.status,
        command.targetStatus,
        actor.role,
      );
      const isDecision =
        target === ReturnRequestStatus.APPROVED ||
        target === ReturnRequestStatus.REJECTED;
      await this.updateStatus(
        transaction,
        request.id,
        request.status,
        target,
        isDecision
          ? {
              decidedByUserId: actor.id,
              decidedAt: new Date(),
              decisionReason: command.reason,
            }
          : {},
      );
      await this.activityLog.record(transaction, {
        actorUserId: actor.id,
        actorRole: actor.role,
        resourceType: ActivityResourceType.RETURN_REQUEST,
        resourceId: request.id,
        action: 'RETURN_REQUEST_STATUS_CHANGED',
        previousStatus: request.status,
        newStatus: target,
        reason: command.reason,
      });
      return this.transitionResult(transaction, request.id, request.status);
    });
  }

  private async create(
    orderId: string,
    orderItemId: string,
    command: CreateReturnCommand,
    actor: ReturnActor,
    customerId: string | null,
  ): Promise<CustomerReturnItem> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const item = await transaction.orderItem.findFirst({
          where: {
            id: orderItemId,
            orderId,
            order: {
              status: OrderStatus.DELIVERED,
              ...(customerId ? { customerId } : {}),
            },
          },
          select: { id: true },
        });
        if (!item) throw orderItemNotFound();
        const unfinished = await transaction.returnRequest.findFirst({
          where: { orderItemId, status: { in: [...UNFINISHED_STATUSES] } },
          select: { id: true },
        });
        if (unfinished) throw duplicateReturn();

        const request = await transaction.returnRequest.create({
          data: {
            orderItemId,
            createdByUserId: actor.id,
            reason: command.reason,
          },
          select: RETURN_SELECT,
        });
        await this.activityLog.record(transaction, {
          actorUserId: actor.id,
          actorRole: actor.role,
          resourceType: ActivityResourceType.RETURN_REQUEST,
          resourceId: request.id,
          action: 'RETURN_REQUEST_CREATED',
          newStatus: ReturnRequestStatus.REQUESTED,
        });
        return projectCustomerReturn(request);
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) throw duplicateReturn();
      throw error;
    }
  }

  private async requireDeliveredOrderItem(
    orderId: string,
    orderItemId: string,
    customerId: string,
  ): Promise<void> {
    const item = await this.prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        orderId,
        order: { customerId, status: OrderStatus.DELIVERED },
      },
      select: { id: true },
    });
    if (!item) throw orderItemNotFound();
  }

  private async updateStatus(
    transaction: Prisma.TransactionClient,
    id: string,
    current: ReturnRequestStatus,
    target: ReturnRequestStatus,
    extra: Prisma.ReturnRequestUncheckedUpdateManyInput = {},
  ): Promise<void> {
    const updated = await transaction.returnRequest.updateMany({
      where: { id, status: current },
      data: { status: target, ...extra },
    });
    if (updated.count !== 1) {
      throw new ConflictException('ReturnRequest status changed concurrently');
    }
  }

  private async transitionResult(
    transaction: Prisma.TransactionClient,
    id: string,
    previousStatus: ReturnRequestStatus,
  ): Promise<ReturnTransitionResult> {
    const updated = await transaction.returnRequest.findUniqueOrThrow({
      where: { id },
      select: { status: true, updatedAt: true },
    });
    return {
      id,
      previousStatus,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  private async isCursor(
    where: Prisma.ReturnRequestWhereInput,
    cursor: { id: string; createdAt: Date },
  ): Promise<boolean> {
    return !!(await this.prisma.returnRequest.findFirst({
      where: { ...where, id: cursor.id, createdAt: cursor.createdAt },
      select: { id: true },
    }));
  }
}

function projectCustomerReturn(request: SelectedReturn): CustomerReturnItem {
  return {
    id: request.id,
    orderId: request.orderItem.orderId,
    orderItemId: request.orderItemId,
    status: request.status,
    reason: request.reason,
    decisionReason: request.decisionReason,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

function projectInternalListItem(
  request: SelectedReturn,
): InternalReturnListItem {
  return {
    id: request.id,
    orderId: request.orderItem.orderId,
    orderItemId: request.orderItemId,
    status: request.status,
    reason: request.reason,
    productName: request.orderItem.productName,
    sku: request.orderItem.sku,
    quantity: request.orderItem.quantity,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

function projectInternalDetail(request: SelectedReturn): InternalReturnDetail {
  const base = projectInternalListItem(request);
  const customer = request.orderItem.order.customer;
  return {
    ...base,
    decisionReason: request.decisionReason,
    decidedAt: request.decidedAt?.toISOString() ?? null,
    customer: customer
      ? {
          type: 'CUSTOMER',
          id: customer.id,
          name: customer.name,
          email: customer.email,
        }
      : { type: 'GUEST' },
  };
}

function internalWhere(
  query: InternalReturnsQuery,
): Prisma.ReturnRequestWhereInput {
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

function afterCursor(cursor: { id: string; createdAt: Date }) {
  return [
    { createdAt: { lt: cursor.createdAt } },
    { createdAt: cursor.createdAt, id: { lt: cursor.id } },
  ];
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

function orderItemNotFound(): NotFoundException {
  return new NotFoundException('Order item not found');
}

function returnNotFound(): NotFoundException {
  return new NotFoundException('ReturnRequest not found');
}

function duplicateReturn(): ConflictException {
  return new ConflictException(
    'An unfinished ReturnRequest already exists for this OrderItem',
  );
}
