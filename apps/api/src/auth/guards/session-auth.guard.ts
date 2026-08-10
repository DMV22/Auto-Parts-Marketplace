import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { IncomingHttpHeaders } from 'node:http';
import { BETTER_AUTH } from '../auth.constants';
import type { AuthenticatedRequest, BetterAuthInstance } from '../auth.types';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(@Inject(BETTER_AUTH) private readonly auth: BetterAuthInstance) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authSession = await this.auth.api.getSession({
      headers: toWebHeaders(request.headers),
    });

    if (!authSession?.user.isActive) {
      throw new UnauthorizedException('Authentication required');
    }

    request.auth = authSession;
    return true;
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
