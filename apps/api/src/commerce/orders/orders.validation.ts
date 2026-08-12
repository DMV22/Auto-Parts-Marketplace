import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { OrderCursor, OrdersPaginationQuery } from './orders.types';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_KEYS = new Set(['limit', 'cursor']);

@Injectable()
export class OrdersPaginationQueryPipe implements PipeTransform<
  unknown,
  OrdersPaginationQuery
> {
  transform(value: unknown): OrdersPaginationQuery {
    if (!isRecord(value)) {
      throw new BadRequestException('Query parameters must be an object');
    }
    const unknownKey = Object.keys(value).find((key) => !ALLOWED_KEYS.has(key));
    if (unknownKey) {
      throw new BadRequestException(`Unknown query parameter: ${unknownKey}`);
    }
    for (const [key, item] of Object.entries(value)) {
      if (typeof item !== 'string') {
        throw new BadRequestException(`${key} must be provided once`);
      }
    }

    return {
      limit: parseLimit(value.limit),
      cursor:
        value.cursor === undefined
          ? null
          : decodeOrderCursor(value.cursor as string),
    };
  }
}

export function encodeOrderCursor(input: {
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

function decodeOrderCursor(value: string): OrderCursor {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as unknown;
    if (!isRecord(parsed) || !UUID_PATTERN.test(String(parsed.id))) {
      throw new Error('Invalid cursor identity');
    }
    const createdAt = new Date(String(parsed.createdAt));
    if (
      Number.isNaN(createdAt.getTime()) ||
      createdAt.toISOString() !== parsed.createdAt
    ) {
      throw new Error('Invalid cursor timestamp');
    }
    return { id: String(parsed.id), createdAt };
  } catch {
    throw new BadRequestException('cursor is invalid');
  }
}

function parseLimit(value: unknown): number {
  if (value === undefined) return 20;
  if (!/^\d+$/.test(value as string)) {
    throw new BadRequestException('limit must be an integer');
  }
  const limit = Number(value);
  if (limit < 1 || limit > 50) {
    throw new BadRequestException('limit must be between 1 and 50');
  }
  return limit;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
