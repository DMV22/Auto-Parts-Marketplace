import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type {
  SupplierProductVariantCursor,
  SupplierProductVariantsQuery,
} from './product-variants.types';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const QUERY_KEYS = new Set(['q', 'cursor', 'limit']);

@Injectable()
export class SupplierProductVariantsQueryPipe implements PipeTransform<
  unknown,
  SupplierProductVariantsQuery
> {
  transform(value: unknown): SupplierProductVariantsQuery {
    const query = requireRecord(value);
    rejectUnknownKeys(query);
    requireSingleStrings(query);
    const search = optionalQuery(query.q);

    return {
      query: search,
      cursor: optionalCursor(query.cursor, search),
      limit: optionalLimit(query.limit),
    };
  }
}

export function encodeSupplierProductVariantCursor(
  cursor: SupplierProductVariantCursor,
): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function optionalQuery(value: unknown): string | null {
  if (value === undefined) return null;
  if (typeof value !== 'string') {
    throw new BadRequestException('q must be provided once');
  }
  const query = value.trim();
  if (!query || query.length > 120) {
    throw new BadRequestException(
      'q must contain between 1 and 120 characters',
    );
  }
  return query;
}

function optionalLimit(value: unknown): number {
  if (value === undefined) return 20;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new BadRequestException('limit must be an integer');
  }
  const limit = Number(value);
  if (limit < 1 || limit > 50) {
    throw new BadRequestException('limit must be between 1 and 50');
  }
  return limit;
}

function optionalCursor(
  value: unknown,
  query: string | null,
): SupplierProductVariantCursor | null {
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
      decoded.query !== query ||
      typeof decoded.productName !== 'string' ||
      typeof decoded.sku !== 'string' ||
      typeof decoded.id !== 'string' ||
      !UUID_PATTERN.test(decoded.id)
    ) {
      throw new Error('invalid cursor');
    }
    return decoded as SupplierProductVariantCursor;
  } catch {
    throw new BadRequestException('cursor is invalid');
  }
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
