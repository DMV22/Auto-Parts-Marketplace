import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { AddCartItemInput, UpdateCartItemInput } from './cart.types';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ADD_ITEM_KEYS = new Set(['listingId', 'quantity']);
const UPDATE_ITEM_KEYS = new Set(['quantity']);

@Injectable()
export class CartAddItemBodyPipe implements PipeTransform<
  unknown,
  AddCartItemInput
> {
  transform(value: unknown): AddCartItemInput {
    if (!isRecord(value)) {
      throw new BadRequestException('Request body must be an object');
    }
    const unknownKey = Object.keys(value).find(
      (key) => !ADD_ITEM_KEYS.has(key),
    );
    if (unknownKey) {
      throw new BadRequestException(`Unknown body field: ${unknownKey}`);
    }
    if (!isUuid(value.listingId)) {
      throw new BadRequestException('listingId must be a UUID');
    }
    if (!Number.isInteger(value.quantity) || (value.quantity as number) <= 0) {
      throw new BadRequestException('quantity must be a positive integer');
    }

    return {
      listingId: value.listingId,
      quantity: value.quantity as number,
    };
  }
}

@Injectable()
export class CartUpdateItemBodyPipe implements PipeTransform<
  unknown,
  UpdateCartItemInput
> {
  transform(value: unknown): UpdateCartItemInput {
    if (!isRecord(value)) {
      throw new BadRequestException('Request body must be an object');
    }
    const unknownKey = Object.keys(value).find(
      (key) => !UPDATE_ITEM_KEYS.has(key),
    );
    if (unknownKey) {
      throw new BadRequestException(`Unknown body field: ${unknownKey}`);
    }
    if (!Number.isInteger(value.quantity) || (value.quantity as number) <= 0) {
      throw new BadRequestException('quantity must be a positive integer');
    }

    return { quantity: value.quantity as number };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}
