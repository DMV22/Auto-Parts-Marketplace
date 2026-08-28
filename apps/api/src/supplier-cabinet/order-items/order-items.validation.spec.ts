import { BadRequestException } from '@nestjs/common';
import {
  encodeSupplierOrderItemCursor,
  SupplierOrderItemsQueryPipe,
} from './order-items.validation';

const ORDER_ITEM_ID = '93000000-0000-4000-8000-000000000001';

describe('supplier order item validation', () => {
  it('normalizes allowlisted filters and bounded pagination', () => {
    const pipe = new SupplierOrderItemsQueryPipe();

    expect(
      pipe.transform({
        status: 'PAID',
        createdFrom: '2026-08-01T00:00:00.000Z',
        createdTo: '2026-08-31T23:59:59.000Z',
        pageSize: '50',
      }),
    ).toEqual({
      status: 'PAID',
      createdFrom: new Date('2026-08-01T00:00:00.000Z'),
      createdTo: new Date('2026-08-31T23:59:59.000Z'),
      cursor: null,
      pageSize: 50,
    });
  });

  it('round-trips an opaque order-created-at and item-id cursor', () => {
    const pipe = new SupplierOrderItemsQueryPipe();
    const cursor = encodeSupplierOrderItemCursor({
      version: 1,
      orderCreatedAt: new Date('2026-08-10T12:00:00.000Z'),
      orderItemId: ORDER_ITEM_ID,
    });

    expect(pipe.transform({ cursor })).toEqual({
      status: null,
      createdFrom: null,
      createdTo: null,
      cursor: {
        version: 1,
        orderCreatedAt: new Date('2026-08-10T12:00:00.000Z'),
        orderItemId: ORDER_ITEM_ID,
      },
      pageSize: 20,
    });
  });

  it.each([
    [{ unexpected: 'value' }],
    [{ status: 'REFUNDED' }],
    [{ pageSize: '0' }],
    [{ pageSize: '51' }],
    [{ createdFrom: 'not-a-date' }],
    [
      {
        createdFrom: '2026-08-02T00:00:00.000Z',
        createdTo: '2026-08-01T00:00:00.000Z',
      },
    ],
    [{ cursor: 'not-a-valid-cursor' }],
  ])('rejects malformed order item query: %j', (query) => {
    expect(() => new SupplierOrderItemsQueryPipe().transform(query)).toThrow(
      BadRequestException,
    );
  });
});
