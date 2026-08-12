import { BadRequestException } from '@nestjs/common';
import {
  CreateSupplierListingPipe,
  RejectSupplierListingPipe,
  UpdateSupplierStockPipe,
  SupplierListingsQueryPipe,
  UpdateSupplierListingPipe,
} from './listings.validation';

const VARIANT_ID = '73000000-0000-4000-8000-000000000001';

describe('supplier listing validation', () => {
  it('normalizes the create contract and excludes server-owned fields', () => {
    const pipe = new CreateSupplierListingPipe();

    expect(
      pipe.transform({
        productVariantId: VARIANT_ID,
        condition: 'NEW',
        price: '1250.50',
        currency: 'uah',
      }),
    ).toEqual({
      productVariantId: VARIANT_ID,
      condition: 'NEW',
      price: '1250.50',
      currency: 'UAH',
    });

    expect(() =>
      pipe.transform({
        productVariantId: VARIANT_ID,
        condition: 'NEW',
        price: '1250.50',
        currency: 'UAH',
        status: 'ACTIVE',
      }),
    ).toThrow(BadRequestException);
  });

  it('accepts only non-empty editable fields in the update contract', () => {
    const pipe = new UpdateSupplierListingPipe();

    expect(pipe.transform({ price: '99.90', currency: 'usd' })).toEqual({
      price: '99.90',
      currency: 'USD',
    });
    expect(() => pipe.transform({})).toThrow(BadRequestException);
    expect(() => pipe.transform({ stockQuantity: 10 })).toThrow(
      BadRequestException,
    );
  });

  it('normalizes a bounded Admin rejection reason', () => {
    const pipe = new RejectSupplierListingPipe();

    expect(pipe.transform({ reason: '  Missing compliance data  ' })).toEqual({
      reason: 'Missing compliance data',
    });
    expect(() => pipe.transform({ reason: '   ' })).toThrow(
      BadRequestException,
    );
    expect(() => pipe.transform({ reason: 'x'.repeat(501) })).toThrow(
      BadRequestException,
    );
    expect(() =>
      pipe.transform({ reason: 'Invalid', status: 'REJECTED' }),
    ).toThrow(BadRequestException);
  });

  it('accepts only an absolute stock quantity and expected version', () => {
    const pipe = new UpdateSupplierStockPipe();

    expect(pipe.transform({ quantity: 12, expectedVersion: 7 })).toEqual({
      quantity: 12,
      expectedVersion: 7,
    });
    expect(() => pipe.transform({ quantity: -1, expectedVersion: 0 })).toThrow(
      BadRequestException,
    );
    expect(() => pipe.transform({ quantity: 1, expectedVersion: -1 })).toThrow(
      BadRequestException,
    );
    expect(() =>
      pipe.transform({ quantity: 1, expectedVersion: 0, status: 'ACTIVE' }),
    ).toThrow(BadRequestException);
  });

  it('normalizes bounded filters and cursor pagination', () => {
    const pipe = new SupplierListingsQueryPipe();

    expect(
      pipe.transform({
        status: 'DRAFT',
        condition: 'USED',
        productVariantId: VARIANT_ID,
        pageSize: '50',
        sort: 'price_asc',
      }),
    ).toEqual({
      status: 'DRAFT',
      condition: 'USED',
      productVariantId: VARIANT_ID,
      cursor: null,
      pageSize: 50,
      sort: 'price_asc',
    });
  });

  it.each([
    [{ unexpected: 'value' }],
    [{ pageSize: '0' }],
    [{ pageSize: '51' }],
    [{ sort: 'newest' }],
    [{ cursor: 'not-a-valid-cursor' }],
    [{ productVariantId: 'not-a-uuid' }],
  ])('rejects malformed listing query: %j', (query) => {
    expect(() => new SupplierListingsQueryPipe().transform(query)).toThrow(
      BadRequestException,
    );
  });
});
