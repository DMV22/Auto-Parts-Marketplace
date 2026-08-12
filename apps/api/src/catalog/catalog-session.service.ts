import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { BETTER_AUTH } from '../auth/auth.constants';
import type { BetterAuthInstance } from '../auth/auth.types';

@Injectable()
export class CatalogSessionService {
  constructor(@Inject(BETTER_AUTH) private readonly auth: BetterAuthInstance) {}

  async requireUserId(headers: IncomingHttpHeaders): Promise<string> {
    const session = await this.auth.api.getSession({
      headers: toWebHeaders(headers),
    });
    if (!session?.user.isActive) {
      throw new UnauthorizedException(
        'Authentication required for savedVehicleId',
      );
    }
    return session.user.id;
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
