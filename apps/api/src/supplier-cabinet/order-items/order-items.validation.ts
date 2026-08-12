import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { OrderStatus } from '../../generated/prisma/enums';
import type {
  SupplierOrderItemCursor,
  SupplierOrderItemsQuery,
} from './order-items.types';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const QUERY_KEYS = new Set([
  'status',
  'createdFrom',
  'createdTo',
  'cursor',
  'pageSize',
]);

@Injectable()
export class SupplierOrderItemsQueryPipe implements PipeTransform<
  unknown,
  SupplierOrderItemsQuery
> {
  transform(value: unknown): SupplierOrderItemsQuery {
    const query = requireRecord(value);
    rejectUnknownKeys(query);
    requireSingleStrings(query);
    const createdFrom = optionalDate(query.createdFrom, 'createdFrom');
    const createdTo = optionalDate(query.createdTo, 'createdTo');
    if (createdFrom && createdTo && createdFrom > createdTo) {
      throw new BadRequestException('createdFrom must not be after createdTo');
    }

    return {
      status: optionalStatus(query.status),
      createdFrom,
      createdTo,
      cursor: optionalCursor(query.cursor),
      pageSize: optionalPageSize(query.pageSize),
    };
  }
}

export function encodeSupplierOrderItemCursor(
  cursor: SupplierOrderItemCursor,
): string {
  return Buffer.from(
    JSON.stringify({
      version: cursor.version,
      orderCreatedAt: cursor.orderCreatedAt.toISOString(),
      orderItemId: cursor.orderItemId,
    }),
    'utf8',
  ).toString('base64url');
}

function optionalCursor(value: unknown): SupplierOrderItemCursor | null {
  if (value === undefined) return null;
  if (typeof value !== 'string' || value.length === 0 || value.length > 1024) {
    throw new BadRequestException('cursor is invalid');
  }
  try {
    const decoded = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as unknown;
    if (
      !isRecord(decoded) ||
      decoded.version !== 1 ||
      typeof decoded.orderItemId !== 'string' ||
      !UUID_PATTERN.test(decoded.orderItemId) ||
      typeof decoded.orderCreatedAt !== 'string'
    ) {
      throw new Error('invalid cursor fields');
    }
    const orderCreatedAt = new Date(decoded.orderCreatedAt);
    if (
      Number.isNaN(orderCreatedAt.getTime()) ||
      orderCreatedAt.toISOString() !== decoded.orderCreatedAt
    ) {
      throw new Error('invalid cursor date');
    }
    return {
      version: 1,
      orderCreatedAt,
      orderItemId: decoded.orderItemId,
    };
  } catch {
    throw new BadRequestException('cursor is invalid');
  }
}

function optionalStatus(value: unknown): OrderStatus | null {
  if (value === undefined) return null;
  if (
    typeof value !== 'string' ||
    !Object.values(OrderStatus).includes(value as OrderStatus)
  ) {
    throw new BadRequestException(
      `status must be one of: ${Object.values(OrderStatus).join(', ')}`,
    );
  }
  return value as OrderStatus;
}

function optionalDate(value: unknown, field: string): Date | null {
  if (value === undefined) return null;
  if (typeof value !== 'string' || value.length === 0) {
    throw new BadRequestException(`${field} must be an ISO 8601 timestamp`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${field} must be an ISO 8601 timestamp`);
  }
  return date;
}

function optionalPageSize(value: unknown): number {
  if (value === undefined) return 20;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new BadRequestException('pageSize must be an integer');
  }
  const pageSize = Number(value);
  if (pageSize < 1 || pageSize > 50) {
    throw new BadRequestException('pageSize must be between 1 and 50');
  }
  return pageSize;
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new BadRequestException('Query parameters must be an object');
  }
  return value;
}

function rejectUnknownKeys(query: Record<string, unknown>): void {
  const unknown = Object.keys(query).find((key) => !QUERY_KEYS.has(key));
  if (unknown) {
    throw new BadRequestException(`Unknown query parameter: ${unknown}`);
  }
}

function requireSingleStrings(query: Record<string, unknown>): void {
  for (const [key, item] of Object.entries(query)) {
    if (typeof item !== 'string') {
      throw new BadRequestException(`${key} must be provided once`);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
