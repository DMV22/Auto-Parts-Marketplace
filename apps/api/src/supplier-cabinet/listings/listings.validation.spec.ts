import { BadRequestException } from '@nestjs/common';
import {
  CreateSupplierListingPipe,
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
