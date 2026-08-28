import { BadRequestException } from '@nestjs/common';
import {
  encodeOrderCursor,
  OrdersPaginationQueryPipe,
} from './orders.validation';

const ORDER_ID = '86000000-0000-4000-8000-000000000001';
const CREATED_AT = '2026-08-12T10:00:00.000Z';

describe('OrdersPaginationQueryPipe', () => {
  const pipe = new OrdersPaginationQueryPipe();

  it('applies bounded defaults and decodes an opaque cursor', () => {
    expect(pipe.transform({})).toEqual({ limit: 20, cursor: null });

    const cursor = encodeOrderCursor({ id: ORDER_ID, createdAt: CREATED_AT });
    expect(pipe.transform({ limit: '50', cursor })).toEqual({
      limit: 50,
      cursor: { id: ORDER_ID, createdAt: new Date(CREATED_AT) },
    });
  });

  it.each([
    [{ extra: 'value' }],
    [{ limit: '0' }],
    [{ limit: '51' }],
    [{ limit: ['20', '30'] }],
    [{ cursor: 'not-a-valid-cursor' }],
  ])('rejects malformed pagination query: %j', (query) => {
    expect(() => pipe.transform(query)).toThrow(BadRequestException);
  });
});
