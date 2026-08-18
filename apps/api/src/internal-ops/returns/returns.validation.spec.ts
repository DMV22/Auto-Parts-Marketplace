import { BadRequestException } from '@nestjs/common';
import { ReturnRequestStatus } from '../../generated/prisma/enums';
import {
  CreateReturnPipe,
  encodeReturnCursor,
  InternalReturnsQueryPipe,
  ReturnTransitionPipe,
} from './returns.validation';

const RETURN_ID = 'b1000000-0000-4000-8000-000000000001';
const CREATED_AT = '2026-08-14T10:00:00.000Z';

describe('Returns validation', () => {
  it('validates and trims a create command', () => {
    expect(
      new CreateReturnPipe().transform({ reason: '  Does not fit  ' }),
    ).toEqual({ reason: 'Does not fit' });
    expect(() => new CreateReturnPipe().transform({ reason: '' })).toThrow(
      BadRequestException,
    );
    expect(() =>
      new CreateReturnPipe().transform({ reason: 'valid', status: 'APPROVED' }),
    ).toThrow(BadRequestException);
  });

  it('applies bounded queue defaults and validates allowlisted filters', () => {
    const pipe = new InternalReturnsQueryPipe();
    expect(pipe.transform({})).toEqual({
      status: null,
      createdFrom: null,
      createdTo: null,
      limit: 20,
      cursor: null,
    });
    expect(
      pipe.transform({
        status: 'UNDER_REVIEW',
        createdFrom: '2026-08-01T00:00:00.000Z',
        createdTo: '2026-08-14T23:59:59.000Z',
        limit: '50',
        cursor: encodeReturnCursor({ id: RETURN_ID, createdAt: CREATED_AT }),
      }),
    ).toEqual({
      status: ReturnRequestStatus.UNDER_REVIEW,
      createdFrom: new Date('2026-08-01T00:00:00.000Z'),
      createdTo: new Date('2026-08-14T23:59:59.000Z'),
      limit: 50,
      cursor: { id: RETURN_ID, createdAt: new Date(CREATED_AT) },
    });
  });

  it.each([
    [{ status: 'UNKNOWN' }],
    [{ limit: '51' }],
    [{ cursor: 'invalid' }],
    [{ unknown: 'value' }],
    [{ status: ['REQUESTED'] }],
  ])('rejects an unsafe queue query: %j', (query) => {
    expect(() => new InternalReturnsQueryPipe().transform(query)).toThrow(
      BadRequestException,
    );
  });

  it('requires a reason only for rejection', () => {
    const pipe = new ReturnTransitionPipe();
    expect(pipe.transform({ targetStatus: 'UNDER_REVIEW' })).toEqual({
      targetStatus: ReturnRequestStatus.UNDER_REVIEW,
      reason: null,
    });
    expect(
      pipe.transform({ targetStatus: 'REJECTED', reason: 'Outside policy' }),
    ).toEqual({
      targetStatus: ReturnRequestStatus.REJECTED,
      reason: 'Outside policy',
    });
    expect(() => pipe.transform({ targetStatus: 'REJECTED' })).toThrow(
      BadRequestException,
    );
    expect(() => pipe.transform({ targetStatus: 'CANCELLED' })).toThrow(
      BadRequestException,
    );
  });
});
