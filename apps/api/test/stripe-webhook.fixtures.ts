import type { CheckoutService } from '../src/commerce/checkout/checkout.service';
import type { VerifiedStripeWebhookEvent } from '../src/commerce/payments/webhook.gateway';
import type { PrismaService } from '../src/prisma/prisma.service';
import {
  CHECKOUT_GUEST_HASH,
  createCheckoutFixtures,
  type FakeCheckoutGateway,
} from './checkout-api.fixtures';

export const WEBHOOK_REQUEST_ID = '85000000-0000-4000-8000-000000000001';

export async function createPendingWebhookOrder(
  prisma: PrismaService,
  checkoutService: CheckoutService,
  gateway: FakeCheckoutGateway,
) {
  await createCheckoutFixtures(prisma);
  const checkout = await checkoutService.createSession(
    { kind: 'GUEST', guestTokenHash: CHECKOUT_GUEST_HASH },
    WEBHOOK_REQUEST_ID,
  );
  const providerSession = gateway.sessions.get(WEBHOOK_REQUEST_ID);
  if (!providerSession) throw new Error('Expected fake Checkout Session');

  return {
    orderId: checkout.orderId,
    checkoutSessionId: providerSession.id,
  };
}

export function verifiedCheckoutEvent(input: {
  externalEventId: string;
  type: string;
  orderId: string;
  checkoutSessionId: string;
  paymentStatus?: string;
  currency?: string;
  amountTotal?: number;
}): VerifiedStripeWebhookEvent {
  return {
    externalEventId: input.externalEventId,
    type: input.type,
    payload: {
      id: input.externalEventId,
      type: input.type,
      data: { object: { id: input.checkoutSessionId } },
    },
    checkoutSession: {
      id: input.checkoutSessionId,
      orderId: input.orderId,
      paymentStatus: input.paymentStatus ?? 'paid',
      currency: input.currency ?? 'uah',
      amountTotal: input.amountTotal ?? 25000,
    },
  };
}
