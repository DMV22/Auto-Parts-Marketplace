import { buildCheckoutReturnUrls } from './checkout-return-url';

const ORDER_ID = '84000000-0000-4000-8000-000000000001';

describe('buildCheckoutReturnUrls', () => {
  it('adds the Order identity and preserves the literal Stripe session placeholder', () => {
    expect(
      buildCheckoutReturnUrls({
        successUrl:
          'http://localhost:3000/checkout/success?campaign=local&session_id={CHECKOUT_SESSION_ID}',
        cancelUrl:
          'http://localhost:3000/checkout/cancel?source=stripe&orderId=stale',
        orderId: ORDER_ID,
      }),
    ).toEqual({
      successUrl:
        `http://localhost:3000/checkout/success?campaign=local&orderId=${ORDER_ID}` +
        '&session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: `http://localhost:3000/checkout/cancel?source=stripe&orderId=${ORDER_ID}`,
    });
  });

  it('builds attempt-specific URLs without duplicating dynamic parameters', () => {
    const otherOrderId = '84000000-0000-4000-8000-000000000002';
    const result = buildCheckoutReturnUrls({
      successUrl:
        `http://localhost:3000/checkout/success?orderId=${ORDER_ID}` +
        '&session_id=stale',
      cancelUrl: `http://localhost:3000/checkout/cancel?orderId=${ORDER_ID}`,
      orderId: otherOrderId,
    });

    expect(result.successUrl).toBe(
      `http://localhost:3000/checkout/success?orderId=${otherOrderId}` +
        '&session_id={CHECKOUT_SESSION_ID}',
    );
    expect(result.cancelUrl).toBe(
      `http://localhost:3000/checkout/cancel?orderId=${otherOrderId}`,
    );
    expect(result.successUrl.match(/orderId=/g)).toHaveLength(1);
    expect(result.successUrl.match(/session_id=/g)).toHaveLength(1);
  });
});
