import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { BETTER_AUTH } from '../auth/auth.constants';
import type { BetterAuthInstance } from '../auth/auth.types';
import { UserRole } from '../generated/prisma/enums';
import type { CommerceActorResolution } from './commerce.types';
import { GuestCartContextService } from './guest-cart-context.service';

@Injectable()
export class CommerceActorService {
  constructor(
    @Inject(BETTER_AUTH) private readonly auth: BetterAuthInstance,
    private readonly guestContext: GuestCartContextService,
  ) {}

  async resolve(
    headers: IncomingHttpHeaders,
  ): Promise<CommerceActorResolution> {
    const session = await this.auth.api.getSession({
      headers: toWebHeaders(headers),
    });

    if (session?.user.isActive && session.user.role === UserRole.CUSTOMER) {
      return {
        actor: { kind: 'CUSTOMER', customerId: session.user.id },
        guestContext: null,
        clearGuestCookie: this.guestContext.hasValidToken(headers.cookie),
      };
    }

    if (session?.user.isActive) {
      throw new ForbiddenException('Customer role required');
    }

    const guestContext = this.guestContext.resolve(headers.cookie);

    return {
      actor: {
        kind: 'GUEST',
        guestTokenHash: guestContext.tokenHash,
      },
      guestContext,
      clearGuestCookie: false,
    };
  }
}

function toWebHeaders(nodeHeaders: IncomingHttpHeaders): Headers {
  const headers = new Headers();

  for (const [name, value] of Object.entries(nodeHeaders)) {
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(name, item));
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }

  return headers;
}
