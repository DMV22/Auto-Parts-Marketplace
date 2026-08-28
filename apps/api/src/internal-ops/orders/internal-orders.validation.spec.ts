import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../../generated/prisma/enums';
import {
  encodeInternalOrderCursor,
  InternalOrdersQueryPipe,
  InternalOrderTransitionPipe,
} from './internal-orders.validation';

const ORDER_ID = 'b1000000-0000-4000-8000-000000000001';
const CREATED_AT = '2026-08-14T10:00:00.000Z';

describe('InternalOrdersQueryPipe', () => {
  const pipe = new InternalOrdersQueryPipe();

  it('applies bounded defaults and accepts the allowlisted filters', () => {
    const cursor = encodeInternalOrderCursor({
      id: ORDER_ID,
      createdAt: CREATED_AT,
    });

    expect(pipe.transform({})).toEqual({
      status: null,
      paymentOutcome: null,
      createdFrom: null,
      createdTo: null,
      limit: 20,
      cursor: null,
    });
    expect(
      pipe.transform({
        status: 'PROCESSING',
        paymentOutcome: 'PAID',
        createdFrom: '2026-08-01T00:00:00.000Z',
        createdTo: '2026-08-14T23:59:59.000Z',
        limit: '50',
        cursor,
      }),
    ).toEqual({
      status: OrderStatus.PROCESSING,
      paymentOutcome: 'PAID',
      createdFrom: new Date('2026-08-01T00:00:00.000Z'),
      createdTo: new Date('2026-08-14T23:59:59.000Z'),
      limit: 50,
      cursor: { id: ORDER_ID, createdAt: new Date(CREATED_AT) },
    });
  });

  it.each([
    [{ unknown: 'value' }],
    [{ status: 'UNKNOWN' }],
    [{ paymentOutcome: 'FAILED' }],
    [{ createdFrom: '2026-08-14' }],
    [
      {
        createdFrom: '2026-08-15T00:00:00.000Z',
        createdTo: '2026-08-14T00:00:00.000Z',
      },
    ],
    [{ limit: '0' }],
    [{ limit: '51' }],
    [{ cursor: 'invalid' }],
    [{ status: ['PAID', 'SHIPPED'] }],
  ])('rejects malformed or non-allowlisted query: %j', (query) => {
    expect(() => pipe.transform(query)).toThrow(BadRequestException);
  });
});

describe('InternalOrderTransitionPipe', () => {
  const pipe = new InternalOrderTransitionPipe();

  it('accepts only an operational target and an optional bounded reason', () => {
    expect(pipe.transform({ targetStatus: 'PROCESSING' })).toEqual({
      targetStatus: OrderStatus.PROCESSING,
      reason: null,
    });
    expect(
      pipe.transform({ targetStatus: 'DELIVERED', reason: 'Handed over' }),
    ).toEqual({
      targetStatus: OrderStatus.DELIVERED,
      reason: 'Handed over',
    });
  });

  it.each([
    [{}],
    [{ targetStatus: 'PAID' }],
    [{ targetStatus: 'CANCELLED' }],
    [{ targetStatus: 'PROCESSING', extra: true }],
    [{ targetStatus: 'SHIPPED', reason: '' }],
    [{ targetStatus: 'SHIPPED', reason: 'x'.repeat(501) }],
  ])('rejects unsafe transition payload: %j', (payload) => {
    expect(() => pipe.transform(payload)).toThrow(BadRequestException);
  });
});
