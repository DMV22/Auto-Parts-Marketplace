import { OrderStatus } from '../../generated/prisma/enums';
import { deriveInternalPaymentOutcome } from './internal-order-payment';

describe('Internal Orders projections', () => {
  it.each([
    [OrderStatus.PENDING_PAYMENT, false, 'PENDING'],
    [OrderStatus.PAID, false, 'PAID'],
    [OrderStatus.PROCESSING, false, 'PAID'],
    [OrderStatus.SHIPPED, false, 'PAID'],
    [OrderStatus.DELIVERED, false, 'PAID'],
    [OrderStatus.CANCELLED, true, 'FAILED_OR_EXPIRED'],
    [OrderStatus.CANCELLED, false, 'NOT_APPLICABLE'],
  ] as const)(
    'derives %s with failure=%s as %s',
    (status, hasPaymentFailureEvidence, expected) => {
      expect(
        deriveInternalPaymentOutcome(status, hasPaymentFailureEvidence),
      ).toBe(expected);
    },
  );
});
