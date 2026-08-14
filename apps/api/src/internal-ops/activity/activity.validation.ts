/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ActivityResourceType } from '../../generated/prisma/enums';
import type {
  ActivityCursor,
  ActivityQuery,
  ActivityResource,
} from './activity.types';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const QUERY_KEYS = new Set([
  'actorId',
  'action',
  'resourceType',
  'resourceId',
  'createdFrom',
  'createdTo',
  'limit',
  'cursor',
]);

@Injectable()
export class ActivityQueryPipe implements PipeTransform<
  unknown,
  ActivityQuery
> {
  transform(value: unknown): ActivityQuery {
    const query = record(value, 'Query parameters');
    allowlist(query);
    singleStrings(query);
    const createdFrom = optionalDate(query.createdFrom, 'createdFrom');
    const createdTo = optionalDate(query.createdTo, 'createdTo');
    if (createdFrom && createdTo && createdFrom > createdTo) {
      throw new BadRequestException('createdFrom must not exceed createdTo');
    }
    return {
      actorId: optionalUuid(query.actorId, 'actorId'),
      action: optionalAction(query.action),
      resourceType: optionalResourceType(query.resourceType),
      resourceId: optionalUuid(query.resourceId, 'resourceId'),
      createdFrom,
      createdTo,
      limit: limit(query.limit),
      cursor:
        query.cursor === undefined
          ? null
          : decodeActivityCursor(query.cursor as string),
    };
  }
}

export function encodeActivityCursor(input: {
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

function decodeActivityCursor(value: string): ActivityCursor {
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

function optionalResourceType(value: unknown): ActivityResource | null {
  if (value === undefined) return null;
  if (
    typeof value !== 'string' ||
    !Object.values(ActivityResourceType).includes(value as ActivityResource)
  ) {
    throw new BadRequestException('resourceType is invalid');
  }
  return value as ActivityResource;
}

function optionalUuid(value: unknown, field: string): string | null {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new BadRequestException(`${field} must be a UUID`);
  }
  return value;
}

function optionalAction(value: unknown): string | null {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !/^[A-Z][A-Z0-9_]{0,99}$/.test(value)) {
    throw new BadRequestException('action is invalid');
  }
  return value;
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

function singleStrings(value: Record<string, unknown>): void {
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== 'string') {
      throw new BadRequestException(`${key} must be provided once`);
    }
  }
}

function allowlist(value: Record<string, unknown>): void {
  const unknown = Object.keys(value).find((key) => !QUERY_KEYS.has(key));
  if (unknown) {
    throw new BadRequestException(`Unknown query parameter: ${unknown}`);
  }
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}
