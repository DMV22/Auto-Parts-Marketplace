import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type {
  CreateNoteCommand,
  NoteCursor,
  NotesQuery,
  RedactNoteCommand,
} from './internal-notes.types';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CREATE_KEYS = new Set(['body', 'correctsNoteId']);
const QUERY_KEYS = new Set(['limit', 'cursor']);
const REDACT_KEYS = new Set(['reason']);

@Injectable()
export class CreateNotePipe implements PipeTransform<
  unknown,
  CreateNoteCommand
> {
  transform(value: unknown): CreateNoteCommand {
    const command = record(value, 'Note payload');
    allowlist(command, CREATE_KEYS, 'note field');
    return {
      body: requiredText(command.body, 'body', 4000),
      correctsNoteId: optionalUuid(command.correctsNoteId, 'correctsNoteId'),
    };
  }
}

@Injectable()
export class NotesQueryPipe implements PipeTransform<unknown, NotesQuery> {
  transform(value: unknown): NotesQuery {
    const query = record(value, 'Query parameters');
    allowlist(query, QUERY_KEYS, 'query parameter');
    singleStrings(query);
    return {
      limit: limit(query.limit),
      cursor:
        query.cursor === undefined
          ? null
          : decodeNoteCursor(query.cursor as string),
    };
  }
}

@Injectable()
export class RedactNotePipe implements PipeTransform<
  unknown,
  RedactNoteCommand
> {
  transform(value: unknown): RedactNoteCommand {
    const command = record(value, 'Redaction payload');
    allowlist(command, REDACT_KEYS, 'redaction field');
    return { reason: requiredText(command.reason, 'reason', 500) };
  }
}

export function encodeNoteCursor(input: {
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

function decodeNoteCursor(value: string): NoteCursor {
  try {
    const cursor = record(
      JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown,
      'cursor',
    );
    if (!UUID_PATTERN.test(String(cursor.id))) throw new Error();
    return { id: String(cursor.id), createdAt: isoDate(cursor.createdAt) };
  } catch {
    throw new BadRequestException('cursor is invalid');
  }
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

function requiredText(value: unknown, field: string, max: number): string {
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

function optionalUuid(value: unknown, field: string): string | null {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new BadRequestException(`${field} must be a UUID`);
  }
  return value;
}

function isoDate(value: unknown): Date {
  if (typeof value !== 'string') throw new Error();
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw new Error();
  }
  return date;
}

function singleStrings(value: Record<string, unknown>): void {
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== 'string') {
      throw new BadRequestException(`${key} must be provided once`);
    }
  }
}

function allowlist(
  value: Record<string, unknown>,
  keys: ReadonlySet<string>,
  label: string,
): void {
  const unknown = Object.keys(value).find((key) => !keys.has(key));
  if (unknown) throw new BadRequestException(`Unknown ${label}: ${unknown}`);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}
