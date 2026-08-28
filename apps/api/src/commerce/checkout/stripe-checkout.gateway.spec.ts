import type { CheckoutConfig } from './checkout.config';
import type { CreateCheckoutSessionCommand } from './checkout.gateway';
import { StripeCheckoutGateway } from './stripe-checkout.gateway';

const mockCreateSession = jest.fn();

jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockCreateSession } },
    webhooks: { constructEvent: jest.fn() },
  })),
}));

const ORDER_ID = '84000000-0000-4000-8000-000000000001';
const IDEMPOTENCY_KEY = '84000000-0000-4000-8000-000000000002';

describe('StripeCheckoutGateway', () => {
  beforeEach(() => {
    mockCreateSession.mockReset();
    mockCreateSession.mockResolvedValue({
      id: 'cs_test_checkout',
      url: 'https://checkout.stripe.test/cs_test_checkout',
      expires_at: 1_800_000_000,
    });
  });

  it('sends server-built success and cancel URLs for the pending Order', async () => {
    const config: CheckoutConfig = {
      secretKey: 'sk_test_local_placeholder',
      webhookSecret: 'whsec_test_local_placeholder',
      successUrl: 'http://localhost:3000/checkout/success',
      cancelUrl: 'http://localhost:3000/checkout/cancel',
    };
    const command: CreateCheckoutSessionCommand = {
      orderId: ORDER_ID,
      idempotencyKey: IDEMPOTENCY_KEY,
      expiresAt: new Date('2027-01-15T08:00:00.000Z'),
      lineItems: [
        {
          name: 'Brake pads (PAD-001)',
          currency: 'UAH',
          unitAmount: 12500,
          quantity: 2,
        },
      ],
    };

    await new StripeCheckoutGateway(config).createSession(command);

    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url:
          `http://localhost:3000/checkout/success?orderId=${ORDER_ID}` +
          '&session_id={CHECKOUT_SESSION_ID}',
        cancel_url: `http://localhost:3000/checkout/cancel?orderId=${ORDER_ID}`,
        client_reference_id: ORDER_ID,
      }),
      { idempotencyKey: IDEMPOTENCY_KEY },
    );
  });
});
