import type {
  CheckoutGateway,
  CheckoutGatewaySession,
  CreateCheckoutSessionCommand,
} from '../src/commerce/checkout/checkout.gateway';
import type { PrismaService } from '../src/prisma/prisma.service';
import {
  ACTIVE_LISTING_ID,
  cleanCartFixtures,
  createCartFixtures,
} from './cart-api.fixtures';

export const CHECKOUT_GUEST_HASH =
  'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd';

export class FakeCheckoutGateway implements CheckoutGateway {
  readonly sessions = new Map<string, CheckoutGatewaySession>();
  readonly calls: CreateCheckoutSessionCommand[] = [];
  beforeCreate?: (command: CreateCheckoutSessionCommand) => Promise<void>;
  error: Error | null = null;

  async createSession(
    command: CreateCheckoutSessionCommand,
  ): Promise<CheckoutGatewaySession> {
    this.calls.push(command);
    await this.beforeCreate?.(command);
    if (this.error) throw this.error;

    const existing = this.sessions.get(command.idempotencyKey);
    if (existing) return existing;

    const session = {
      id: `cs_test_${command.orderId}`,
      url: `https://checkout.stripe.test/${command.orderId}`,
      expiresAt: command.expiresAt,
    };
    this.sessions.set(command.idempotencyKey, session);
    return session;
  }
}

export async function createGuestCheckoutCart(
  prisma: PrismaService,
  quantity = 2,
  guestTokenHash = CHECKOUT_GUEST_HASH,
): Promise<void> {
  await prisma.cart.create({
    data: {
      guestTokenHash,
      currency: 'UAH',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      items: {
        create: { listingId: ACTIVE_LISTING_ID, quantity },
      },
    },
  });
}

export async function createCheckoutFixtures(
  prisma: PrismaService,
): Promise<void> {
  await createCartFixtures(prisma);
  await createGuestCheckoutCart(prisma);
}

export async function cleanCheckoutFixtures(
  prisma: PrismaService,
): Promise<void> {
  await prisma.orderStatusEvent.deleteMany();
  await prisma.paymentEvent.deleteMany();
  await prisma.returnRequest.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await cleanCartFixtures(prisma);
}
