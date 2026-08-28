import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { OrderStatus } from '../../generated/prisma/enums';
import type {
  InternalOrderCursor,
  InternalOrdersQuery,
  InternalOrderTransitionCommand,
  InternalPaymentOutcome,
} from './internal-orders.types';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const QUERY_KEYS = new Set([
  'status',
  'paymentOutcome',
  'createdFrom',
  'createdTo',
  'limit',
  'cursor',
]);
const TRANSITION_KEYS = new Set(['targetStatus', 'reason']);
const PAYMENT_OUTCOMES = new Set<InternalPaymentOutcome>([
  'PENDING',
  'PAID',
  'FAILED_OR_EXPIRED',
  'NOT_APPLICABLE',
]);
const TRANSITION_TARGETS = new Set<OrderStatus>([
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
]);

@Injectable()
export class InternalOrdersQueryPipe implements PipeTransform<
  unknown,
  InternalOrdersQuery
> {
  transform(value: unknown): InternalOrdersQuery {
    const query = record(value, 'Query parameters');
    assertAllowlist(query, QUERY_KEYS, 'query parameter');
    assertSingleStrings(query);

    const createdFrom = optionalDate(query.createdFrom, 'createdFrom');
    const createdTo = optionalDate(query.createdTo, 'createdTo');
    if (createdFrom && createdTo && createdFrom > createdTo) {
      throw new BadRequestException('createdFrom must not exceed createdTo');
    }

    return {
      status: optionalEnum(query.status, OrderStatus, 'status'),
      paymentOutcome: optionalPaymentOutcome(query.paymentOutcome),
      createdFrom,
      createdTo,
      limit: limit(query.limit),
      cursor:
        query.cursor === undefined
          ? null
          : decodeInternalOrderCursor(query.cursor as string),
    };
  }
}

@Injectable()
export class InternalOrderTransitionPipe implements PipeTransform<
  unknown,
  InternalOrderTransitionCommand
> {
  transform(value: unknown): InternalOrderTransitionCommand {
    const command = record(value, 'Transition payload');
    assertAllowlist(command, TRANSITION_KEYS, 'transition field');
    const targetStatus = optionalEnum(
      command.targetStatus,
      OrderStatus,
      'targetStatus',
    );
    if (!targetStatus || !TRANSITION_TARGETS.has(targetStatus)) {
      throw new BadRequestException(
        'targetStatus must be PROCESSING, SHIPPED or DELIVERED',
      );
    }

    let reason: string | null = null;
    if (command.reason !== undefined) {
      if (
        typeof command.reason !== 'string' ||
        command.reason.trim().length === 0 ||
        command.reason.length > 500
      ) {
        throw new BadRequestException(
          'reason must be a non-empty string of at most 500 characters',
        );
      }
      reason = command.reason.trim();
    }
    return { targetStatus, reason };
  }
}

export function encodeInternalOrderCursor(input: {
  id: string;
  createdAt: Date | string;
}): string {
  const createdAt =
    input.createdAt instanceof Date
      ? input.createdAt.toISOString()
      : input.createdAt;
  return Buffer.from(JSON.stringify({ id: input.id, createdAt })).toString(
    'base64url',
  );
}

function decodeInternalOrderCursor(value: string): InternalOrderCursor {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as unknown;
    const cursor = record(parsed, 'cursor');
    if (!UUID_PATTERN.test(String(cursor.id))) throw new Error();
    const createdAt = parseDate(cursor.createdAt);
    return { id: String(cursor.id), createdAt };
  } catch {
    throw new BadRequestException('cursor is invalid');
  }
}

function optionalPaymentOutcome(value: unknown): InternalPaymentOutcome | null {
  if (value === undefined) return null;
  if (
    typeof value !== 'string' ||
    !PAYMENT_OUTCOMES.has(value as InternalPaymentOutcome)
  ) {
    throw new BadRequestException('paymentOutcome is invalid');
  }
  return value as InternalPaymentOutcome;
}

function optionalDate(value: unknown, field: string): Date | null {
  if (value === undefined) return null;
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} must be an ISO timestamp`);
  }
  try {
    return parseDate(value);
  } catch {
    throw new BadRequestException(`${field} must be an ISO timestamp`);
  }
}

function parseDate(value: unknown): Date {
  if (typeof value !== 'string') throw new Error();
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw new Error();
  }
  return date;
}

function limit(value: unknown): number {
  if (value === undefined) return 20;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new BadRequestException('limit must be an integer');
  }
  const parsed = Number(value);
  if (parsed < 1 || parsed > 50) {
    throw new BadRequestException('limit must be between 1 and 50');
  }
  return parsed;
}

function optionalEnum<T extends Record<string, string>>(
  value: unknown,
  enumObject: T,
  field: string,
): T[keyof T] | null {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !Object.values(enumObject).includes(value)) {
    throw new BadRequestException(`${field} is invalid`);
  }
  return value as T[keyof T];
}

function assertSingleStrings(value: Record<string, unknown>): void {
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== 'string') {
      throw new BadRequestException(`${key} must be provided once`);
    }
  }
}

function assertAllowlist(
  value: Record<string, unknown>,
  allowlist: ReadonlySet<string>,
  label: string,
): void {
  const unknown = Object.keys(value).find((key) => !allowlist.has(key));
  if (unknown) throw new BadRequestException(`Unknown ${label}: ${unknown}`);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}
