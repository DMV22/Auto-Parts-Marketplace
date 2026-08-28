import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import {
  ListingCondition,
  type ListingCondition as ListingConditionValue,
} from '../generated/prisma/enums';
import type { CatalogQuery, CatalogSort } from './catalog.types';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRICE_PATTERN = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;
const ALLOWED_KEYS = new Set([
  'q',
  'categoryId',
  'brandId',
  'minPrice',
  'maxPrice',
  'currency',
  'inStock',
  'condition',
  'year',
  'generationId',
  'engineTypeId',
  'savedVehicleId',
  'page',
  'pageSize',
  'sort',
]);
const SORTS = new Set<CatalogSort>([
  'newest',
  'name_asc',
  'name_desc',
  'price_asc',
  'price_desc',
]);

@Injectable()
export class CatalogQueryPipe implements PipeTransform<unknown, CatalogQuery> {
  transform(value: unknown): CatalogQuery {
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

    const q = optionalText(value.q, 'q', 120);
    const categoryId = optionalUuid(value.categoryId, 'categoryId');
    const brandId = optionalUuid(value.brandId, 'brandId');
    const minPrice = optionalPrice(value.minPrice, 'minPrice');
    const maxPrice = optionalPrice(value.maxPrice, 'maxPrice');
    const currency = optionalCurrency(value.currency);
    const inStock = optionalBoolean(value.inStock, 'inStock');
    const condition = optionalCondition(value.condition);
    const year = optionalInteger(
      value.year,
      'year',
      1886,
      new Date().getUTCFullYear() + 1,
    );
    const generationId = optionalUuid(value.generationId, 'generationId');
    const engineTypeId = optionalUuid(value.engineTypeId, 'engineTypeId');
    const savedVehicleId = optionalUuid(value.savedVehicleId, 'savedVehicleId');
    const page = optionalInteger(value.page, 'page', 1, 1_000_000) ?? 1;
    const pageSize = optionalInteger(value.pageSize, 'pageSize', 1, 50) ?? 20;
    const sort = optionalSort(value.sort);

    if ((minPrice || maxPrice || sort.startsWith('price_')) && !currency) {
      throw new BadRequestException(
        'currency is required for price filters and price sorting',
      );
    }
    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      throw new BadRequestException('minPrice must not exceed maxPrice');
    }
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

    return {
      q,
      categoryId,
      brandId,
      minPrice,
      maxPrice,
      currency,
      inStock,
      condition,
      year,
      generationId,
      engineTypeId,
      savedVehicleId,
      page,
      pageSize,
      sort,
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalText(
  value: unknown,
  field: string,
  maximumLength: number,
): string | null {
  if (value === undefined) return null;
  const normalized = (value as string).trim();
  if (!normalized || normalized.length > maximumLength) {
    throw new BadRequestException(
      `${field} must contain between 1 and ${maximumLength} characters`,
    );
  }
  return normalized;
}

function optionalUuid(value: unknown, field: string): string | null {
  if (value === undefined) return null;
  if (!UUID_PATTERN.test(value as string)) {
    throw new BadRequestException(`${field} must be a UUID`);
  }
  return value as string;
}

function optionalPrice(value: unknown, field: string): string | null {
  if (value === undefined) return null;
  if (!PRICE_PATTERN.test(value as string)) {
    throw new BadRequestException(
      `${field} must be a non-negative decimal with at most two fraction digits`,
    );
  }
  return value as string;
}

function optionalCurrency(value: unknown): string | null {
  if (value === undefined) return null;
  const normalized = (value as string).toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new BadRequestException('currency must be a three-letter code');
  }
  return normalized;
}

function optionalBoolean(value: unknown, field: string): boolean | null {
  if (value === undefined) return null;
  if (value !== 'true' && value !== 'false') {
    throw new BadRequestException(`${field} must be true or false`);
  }
  return value === 'true';
}

function optionalCondition(value: unknown): ListingConditionValue | null {
  if (value === undefined) return null;
  if (
    !Object.values(ListingCondition).includes(value as ListingConditionValue)
  ) {
    throw new BadRequestException(
      `condition must be one of: ${Object.values(ListingCondition).join(', ')}`,
    );
  }
  return value as ListingConditionValue;
}

function optionalInteger(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
): number | null {
  if (value === undefined) return null;
  if (!/^\d+$/.test(value as string)) {
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

function optionalSort(value: unknown): CatalogSort {
  if (value === undefined) return 'newest';
  if (!SORTS.has(value as CatalogSort)) {
    throw new BadRequestException(
      `sort must be one of: ${[...SORTS].join(', ')}`,
    );
  }
  return value as CatalogSort;
}
