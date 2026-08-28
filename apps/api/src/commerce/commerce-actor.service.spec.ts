import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../generated/prisma/enums';
import type { BetterAuthInstance } from '../auth/auth.types';
import { CommerceActorService } from './commerce-actor.service';
import { GuestCartContextService } from './guest-cart-context.service';

const CUSTOMER_ID = '90000000-0000-4000-8000-000000000001';
const GUEST_TOKEN = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

describe('CommerceActorService', () => {
  it('gives an authenticated Customer precedence over a guest cookie', async () => {
    const auth = createAuthBoundary({
      session: {
        id: 'session-id',
        userId: CUSTOMER_ID,
        token: 'session-token',
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      },
      user: {
        id: CUSTOMER_ID,
        email: 'customer@example.test',
        name: 'Customer',
        role: UserRole.CUSTOMER,
        isActive: true,
      },
    });
    const service = new CommerceActorService(
      auth,
      new GuestCartContextService(),
    );

    await expect(
      service.resolve({ cookie: `apm_guest_cart=${GUEST_TOKEN}` }),
    ).resolves.toEqual({
      actor: { kind: 'CUSTOMER', customerId: CUSTOMER_ID },
      guestContext: null,
      clearGuestCookie: true,
    });
  });

  it('resolves an unauthenticated request as the matching Guest', async () => {
    const service = new CommerceActorService(
      createAuthBoundary(null),
      new GuestCartContextService(),
    );

    await expect(
      service.resolve({ cookie: `apm_guest_cart=${GUEST_TOKEN}` }),
    ).resolves.toEqual({
      actor: {
        kind: 'GUEST',
        guestTokenHash:
          '0f007385b6f9d4b7eeb2748605afe1a984a0a3bfa3f014d09e2a784ce9e5cd1a',
      },
      guestContext: {
        token: GUEST_TOKEN,
        tokenHash:
          '0f007385b6f9d4b7eeb2748605afe1a984a0a3bfa3f014d09e2a784ce9e5cd1a',
        isNew: false,
      },
      clearGuestCookie: false,
    });
  });

  it('does not downgrade another active role to Guest', async () => {
    const auth = createAuthBoundary({
      session: {
        id: 'supplier-session-id',
        userId: CUSTOMER_ID,
        token: 'supplier-session-token',
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      },
      user: {
        id: CUSTOMER_ID,
        email: 'supplier@example.test',
        name: 'Supplier',
        role: UserRole.SUPPLIER_USER,
        isActive: true,
      },
    });
    const service = new CommerceActorService(
      auth,
      new GuestCartContextService(),
    );

    await expect(service.resolve({})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

function createAuthBoundary(
  session: Awaited<ReturnType<BetterAuthInstance['api']['getSession']>>,
): BetterAuthInstance {
  return {
    handler: jest.fn(),
    api: { getSession: jest.fn().mockResolvedValue(session) },
  };
}
