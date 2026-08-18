import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ReturnRequestStatus } from '../../generated/prisma/enums';
import type {
  CreateReturnCommand,
  InternalReturnsQuery,
  ReturnCursor,
  ReturnTransitionCommand,
} from './returns.types';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CREATE_KEYS = new Set(['reason']);
const QUERY_KEYS = new Set([
  'status',
  'createdFrom',
  'createdTo',
  'limit',
  'cursor',
]);
const TRANSITION_KEYS = new Set(['targetStatus', 'reason']);
const INTERNAL_TARGETS = new Set<ReturnRequestStatus>([
  ReturnRequestStatus.UNDER_REVIEW,
  ReturnRequestStatus.APPROVED,
  ReturnRequestStatus.REJECTED,
  ReturnRequestStatus.RECEIVED,
  ReturnRequestStatus.COMPLETED,
]);

@Injectable()
export class CreateReturnPipe implements PipeTransform<
  unknown,
  CreateReturnCommand
> {
  transform(value: unknown): CreateReturnCommand {
    const command = record(value, 'Return payload');
    assertAllowlist(command, CREATE_KEYS, 'return field');
    return { reason: requiredText(command.reason, 'reason', 1000) };
  }
}

@Injectable()
export class InternalReturnsQueryPipe implements PipeTransform<
  unknown,
  InternalReturnsQuery
> {
  transform(value: unknown): InternalReturnsQuery {
    const query = record(value, 'Query parameters');
    assertAllowlist(query, QUERY_KEYS, 'query parameter');
    assertSingleStrings(query);

    const createdFrom = optionalDate(query.createdFrom, 'createdFrom');
    const createdTo = optionalDate(query.createdTo, 'createdTo');
    if (createdFrom && createdTo && createdFrom > createdTo) {
      throw new BadRequestException('createdFrom must not exceed createdTo');
    }

    return {
      status: optionalStatus(query.status),
      createdFrom,
      createdTo,
      limit: boundedLimit(query.limit),
      cursor:
        query.cursor === undefined
          ? null
          : decodeReturnCursor(query.cursor as string),
    };
  }
}

@Injectable()
export class ReturnTransitionPipe implements PipeTransform<
  unknown,
  ReturnTransitionCommand
> {
  transform(value: unknown): ReturnTransitionCommand {
    const command = record(value, 'Transition payload');
    assertAllowlist(command, TRANSITION_KEYS, 'transition field');
    const targetStatus = optionalStatus(command.targetStatus);
    if (!targetStatus || !INTERNAL_TARGETS.has(targetStatus)) {
      throw new BadRequestException(
        'targetStatus is not an internal transition',
      );
    }

    const reason = optionalText(command.reason, 'reason', 500);
    if (targetStatus === ReturnRequestStatus.REJECTED && !reason) {
      throw new BadRequestException(
        'reason is required when rejecting a return',
      );
    }
    return { targetStatus, reason };
  }
}

export function encodeReturnCursor(input: {
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

function decodeReturnCursor(value: string): ReturnCursor {
  try {
    const cursor = record(
      JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown,
      'cursor',
    );
    if (!UUID_PATTERN.test(String(cursor.id))) throw new Error();
    return { id: String(cursor.id), createdAt: parseDate(cursor.createdAt) };
  } catch {
    throw new BadRequestException('cursor is invalid');
  }
}

function optionalStatus(value: unknown): ReturnRequestStatus | null {
  if (value === undefined) return null;
  if (
    typeof value !== 'string' ||
    !Object.values(ReturnRequestStatus).includes(value as ReturnRequestStatus)
  ) {
    throw new BadRequestException('status is invalid');
  }
  return value as ReturnRequestStatus;
}

function optionalDate(value: unknown, field: string): Date | null {
  if (value === undefined) return null;
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

function boundedLimit(value: unknown): number {
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

function requiredText(value: unknown, field: string, max: number): string {
  const result = optionalText(value, field, max);
  if (!result) throw new BadRequestException(`${field} is required`);
  return result;
}

function optionalText(
  value: unknown,
  field: string,
  max: number,
): string | null {
  if (value === undefined) return null;
  if (
    typeof value !== 'string' ||
    value.trim().length === 0 ||
    value.length > max
  ) {
    throw new BadRequestException(
      `${field} must be a non-empty string of at most ${max} characters`,
    );
  }
  return value.trim();
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
