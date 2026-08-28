import { BadRequestException } from '@nestjs/common';
import {
  CheckoutBodyPipe,
  CheckoutIdempotencyKeyPipe,
} from './checkout.validation';

describe('Checkout request validation', () => {
  const idempotencyPipe = new CheckoutIdempotencyKeyPipe();
  const bodyPipe = new CheckoutBodyPipe();

  it('accepts a UUID v4 Idempotency-Key and an empty body', () => {
    expect(
      idempotencyPipe.transform('83000000-0000-4000-8000-000000000001'),
    ).toBe('83000000-0000-4000-8000-000000000001');
    expect(bodyPipe.transform(undefined)).toEqual({});
    expect(bodyPipe.transform({})).toEqual({});
  });

  it.each([
    undefined,
    '',
    'not-a-uuid',
    '83000000-0000-3000-8000-000000000001',
  ])('rejects an invalid Idempotency-Key: %s', (value) => {
    expect(() => idempotencyPipe.transform(value)).toThrow(BadRequestException);
  });

  it.each([
    { price: '1.00' },
    { total: '1.00' },
    { customerId: '83000000-0000-4000-8000-000000000001' },
    { status: 'PAID' },
  ])('rejects client-owned checkout fields: %o', (body) => {
    expect(() => bodyPipe.transform(body)).toThrow(BadRequestException);
  });
});
