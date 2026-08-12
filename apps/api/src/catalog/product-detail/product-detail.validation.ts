import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { ProductDetailQuery } from './product-detail.types';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_QUERY_KEYS = new Set([
  'year',
  'generationId',
  'engineTypeId',
  'savedVehicleId',
]);

@Injectable()
export class ProductDetailQueryPipe implements PipeTransform<
  unknown,
  ProductDetailQuery
> {
  transform(value: unknown): ProductDetailQuery {
    if (!isRecord(value)) {
      throw new BadRequestException('Query parameters must be an object');
    }
    const unknownKey = Object.keys(value).find(
      (key) => !ALLOWED_QUERY_KEYS.has(key),
    );
    if (unknownKey) {
      throw new BadRequestException(`Unknown query parameter: ${unknownKey}`);
    }
    for (const [key, item] of Object.entries(value)) {
      if (typeof item !== 'string') {
        throw new BadRequestException(`${key} must be provided once`);
      }
    }

    const year = optionalYear(value.year);
    const generationId = optionalUuid(value.generationId, 'generationId');
    const engineTypeId = optionalUuid(value.engineTypeId, 'engineTypeId');
    const savedVehicleId = optionalUuid(value.savedVehicleId, 'savedVehicleId');
    if ((year === null) !== (generationId === null)) {
      throw new BadRequestException(
        'year and generationId must be provided together',
      );
    }
    if (engineTypeId && !generationId) {
      throw new BadRequestException(
        'engineTypeId requires year and generationId',
      );
    }
    if (savedVehicleId && (year || generationId || engineTypeId)) {
      throw new BadRequestException(
        'savedVehicleId conflicts with explicit vehicle context',
      );
    }
    return { year, generationId, engineTypeId, savedVehicleId };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalUuid(value: unknown, field: string): string | null {
  if (value === undefined) return null;
  if (!UUID_PATTERN.test(value as string)) {
    throw new BadRequestException(`${field} must be a UUID`);
  }
  return value as string;
}

function optionalYear(value: unknown): number | null {
  if (value === undefined) return null;
  if (!/^\d+$/.test(value as string)) {
    throw new BadRequestException('year must be an integer');
  }
  const year = Number(value);
  const maximum = new Date().getUTCFullYear() + 1;
  if (year < 1886 || year > maximum) {
    throw new BadRequestException(`year must be between 1886 and ${maximum}`);
  }
  return year;
}
