import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ListingCondition, ListingStatus } from '../../generated/prisma/enums';
import type {
  AdminModerationCursor,
  AdminModerationQuery,
  CreateSupplierListing,
  RejectSupplierListing,
  SupplierListingCursor,
  SupplierListingsQuery,
  SupplierListingSort,
  UpdateSupplierListing,
  UpdateSupplierStock,
} from './listings.types';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const POSITIVE_PRICE_PATTERN =
  /^(?:0\.(?:0[1-9]|[1-9]\d?)|[1-9]\d{0,9}(?:\.\d{1,2})?)$/;
const CURSOR_PRICE_PATTERN = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;
const MUTABLE_KEYS = new Set([
  'productVariantId',
  'condition',
  'price',
  'currency',
]);
const QUERY_KEYS = new Set([
  'status',
  'condition',
  'productVariantId',
  'cursor',
  'pageSize',
  'sort',
]);
const MODERATION_QUERY_KEYS = new Set([
  'status',
  'condition',
  'supplierId',
  'createdFrom',
  'createdTo',
  'cursor',
  'pageSize',
]);
const SORTS = new Set<SupplierListingSort>([
  'updated_desc',
  'updated_asc',
  'price_asc',
  'price_desc',
]);

@Injectable()
export class CreateSupplierListingPipe implements PipeTransform<
  unknown,
  CreateSupplierListing
> {
  transform(value: unknown): CreateSupplierListing {
    const body = requireRecord(value, 'Request body');
    rejectUnknownKeys(body, MUTABLE_KEYS);
    for (const key of MUTABLE_KEYS) {
      if (body[key] === undefined) {
        throw new BadRequestException(`${key} is required`);
      }
    }
    return parseMutableFields(body) as CreateSupplierListing;
  }
}

@Injectable()
export class UpdateSupplierListingPipe implements PipeTransform<
  unknown,
  UpdateSupplierListing
> {
  transform(value: unknown): UpdateSupplierListing {
    const body = requireRecord(value, 'Request body');
    rejectUnknownKeys(body, MUTABLE_KEYS);
    if (Object.keys(body).length === 0) {
      throw new BadRequestException('At least one editable field is required');
    }
    return parseMutableFields(body);
  }
}

@Injectable()
export class RejectSupplierListingPipe implements PipeTransform<
  unknown,
  RejectSupplierListing
> {
  transform(value: unknown): RejectSupplierListing {
    const body = requireRecord(value, 'Request body');
    rejectUnknownKeys(body, new Set(['reason']));
    if (typeof body.reason !== 'string') {
      throw new BadRequestException('reason is required');
    }
    const reason = body.reason.trim();
    if (!reason || reason.length > 500) {
      throw new BadRequestException(
        'reason must contain between 1 and 500 characters',
      );
    }
    return { reason };
  }
}

@Injectable()
export class UpdateSupplierStockPipe implements PipeTransform<
  unknown,
  UpdateSupplierStock
> {
  transform(value: unknown): UpdateSupplierStock {
    const body = requireRecord(value, 'Request body');
    rejectUnknownKeys(body, new Set(['quantity', 'expectedVersion']));
    return {
      quantity: requiredDatabaseInteger(body.quantity, 'quantity'),
      expectedVersion: requiredDatabaseInteger(
        body.expectedVersion,
        'expectedVersion',
      ),
    };
  }
}

@Injectable()
export class SupplierListingsQueryPipe implements PipeTransform<
  unknown,
  SupplierListingsQuery
> {
  transform(value: unknown): SupplierListingsQuery {
    const query = requireRecord(value, 'Query parameters');
    rejectUnknownKeys(query, QUERY_KEYS, 'query parameter');
    requireSingleStrings(query);
    const sort = optionalSort(query.sort);

    return {
      status: optionalEnum(query.status, ListingStatus, 'status'),
      condition: optionalEnum(query.condition, ListingCondition, 'condition'),
      productVariantId: optionalUuid(
        query.productVariantId,
        'productVariantId',
      ),
      cursor: optionalCursor(query.cursor, sort),
      pageSize: optionalInteger(query.pageSize, 'pageSize', 1, 50) ?? 20,
      sort,
    };
  }
}

@Injectable()
export class AdminModerationQueryPipe implements PipeTransform<
  unknown,
  AdminModerationQuery
> {
  transform(value: unknown): AdminModerationQuery {
    const query = requireRecord(value, 'Query parameters');
    rejectUnknownKeys(query, MODERATION_QUERY_KEYS, 'query parameter');
    requireSingleStrings(query);
    const createdFrom = optionalDate(query.createdFrom, 'createdFrom');
    const createdTo = optionalDate(query.createdTo, 'createdTo');
    if (createdFrom && createdTo && createdFrom > createdTo) {
      throw new BadRequestException('createdFrom must not exceed createdTo');
    }
    return {
      status:
        optionalEnum(query.status, ListingStatus, 'status') ??
        ListingStatus.PENDING_APPROVAL,
      condition: optionalEnum(query.condition, ListingCondition, 'condition'),
      supplierId: optionalUuid(query.supplierId, 'supplierId'),
      createdFrom,
      createdTo,
      cursor: optionalModerationCursor(query.cursor),
      pageSize: optionalInteger(query.pageSize, 'pageSize', 1, 50) ?? 20,
    };
  }
}

export function encodeSupplierListingCursor(
  cursor: SupplierListingCursor,
): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function encodeAdminModerationCursor(
  cursor: AdminModerationCursor,
): string {
  return Buffer.from(
    JSON.stringify({
      id: cursor.id,
      updatedAt: cursor.updatedAt.toISOString(),
    }),
    'utf8',
  ).toString('base64url');
}

function optionalModerationCursor(
  value: unknown,
): AdminModerationCursor | null {
  if (value === undefined) return null;
  if (typeof value !== 'string' || value.length === 0 || value.length > 1024) {
    throw new BadRequestException('cursor is invalid');
  }
  try {
    const decoded = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as unknown;
    if (!isRecord(decoded) || typeof decoded.id !== 'string') throw new Error();
    const updatedAt = new Date(String(decoded.updatedAt));
    if (
      !UUID_PATTERN.test(decoded.id) ||
      Number.isNaN(updatedAt.getTime()) ||
      updatedAt.toISOString() !== decoded.updatedAt
    ) {
      throw new Error();
    }
    return { id: decoded.id, updatedAt };
  } catch {
    throw new BadRequestException('cursor is invalid');
  }
}

function parseMutableFields(
  body: Record<string, unknown>,
): UpdateSupplierListing {
  const result: UpdateSupplierListing = {};
  if (body.productVariantId !== undefined) {
    result.productVariantId = requiredUuid(
      body.productVariantId,
      'productVariantId',
    );
  }
  if (body.condition !== undefined) {
    result.condition = requiredEnum(
      body.condition,
      ListingCondition,
      'condition',
    );
  }
  if (body.price !== undefined) {
    if (
      typeof body.price !== 'string' ||
      !POSITIVE_PRICE_PATTERN.test(body.price)
    ) {
      throw new BadRequestException(
        'price must be a positive decimal with at most two fraction digits',
      );
    }
    result.price = body.price;
  }
  if (body.currency !== undefined) {
    if (typeof body.currency !== 'string') {
      throw new BadRequestException('currency must be a three-letter code');
    }
    const currency = body.currency.toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new BadRequestException('currency must be a three-letter code');
    }
    result.currency = currency;
  }
  return result;
}

function optionalCursor(
  value: unknown,
  sort: SupplierListingSort,
): SupplierListingCursor | null {
  if (value === undefined) return null;
  if (typeof value !== 'string' || value.length === 0 || value.length > 1024) {
    throw new BadRequestException('cursor is invalid');
  }
  try {
    const decoded = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as unknown;
    if (!isRecord(decoded)) throw new Error('invalid shape');
    if (
      decoded.version !== 1 ||
      decoded.sort !== sort ||
      typeof decoded.id !== 'string' ||
      !UUID_PATTERN.test(decoded.id) ||
      typeof decoded.value !== 'string'
    ) {
      throw new Error('invalid fields');
    }
    if (sort.startsWith('updated_')) {
      const date = new Date(decoded.value);
      if (
        Number.isNaN(date.getTime()) ||
        date.toISOString() !== decoded.value
      ) {
        throw new Error('invalid date');
      }
    } else if (!CURSOR_PRICE_PATTERN.test(decoded.value)) {
      throw new Error('invalid price');
    }
    return decoded as SupplierListingCursor;
  } catch {
    throw new BadRequestException('cursor is invalid');
  }
}

function optionalSort(value: unknown): SupplierListingSort {
  if (value === undefined) return 'updated_desc';
  if (typeof value !== 'string' || !SORTS.has(value as SupplierListingSort)) {
    throw new BadRequestException(
      `sort must be one of: ${[...SORTS].join(', ')}`,
    );
  }
  return value as SupplierListingSort;
}

function optionalUuid(value: unknown, field: string): string | null {
  return value === undefined ? null : requiredUuid(value, field);
}

function optionalDate(value: unknown, field: string): Date | null {
  if (value === undefined) return null;
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} must be an ISO timestamp`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw new BadRequestException(`${field} must be an ISO timestamp`);
  }
  return date;
}

function requiredUuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new BadRequestException(`${field} must be a UUID`);
  }
  return value;
}

function optionalEnum<T extends string>(
  value: unknown,
  values: Record<string, T>,
  field: string,
): T | null {
  return value === undefined ? null : requiredEnum(value, values, field);
}

function requiredEnum<T extends string>(
  value: unknown,
  values: Record<string, T>,
  field: string,
): T {
  if (
    typeof value !== 'string' ||
    !Object.values(values).includes(value as T)
  ) {
    throw new BadRequestException(
      `${field} must be one of: ${Object.values(values).join(', ')}`,
    );
  }
  return value as T;
}

function optionalInteger(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
): number | null {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new BadRequestException(`${field} must be an integer`);
  }
  const parsed = Number(value);
  if (parsed < minimum || parsed > maximum) {
    throw new BadRequestException(
      `${field} must be between ${minimum} and ${maximum}`,
    );
  }
  return parsed;
}

function requiredDatabaseInteger(value: unknown, field: string): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 2_147_483_647
  ) {
    throw new BadRequestException(
      `${field} must be an integer between 0 and 2147483647`,
    );
  }
  return value;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new BadRequestException(`${label} must be an object`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  label = 'field',
): void {
  const unknown = Object.keys(value).find((key) => !allowed.has(key));
  if (unknown) throw new BadRequestException(`Unknown ${label}: ${unknown}`);
}

function requireSingleStrings(value: Record<string, unknown>): void {
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== 'string') {
      throw new BadRequestException(`${key} must be provided once`);
    }
  }
}
