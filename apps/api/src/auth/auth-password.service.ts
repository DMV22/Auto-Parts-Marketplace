import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { BETTER_AUTH } from './auth.constants';
import type { AuthPasswordResponse } from './auth-password.types';
import type { BetterAuthPasswordInstance } from './auth.types';

@Injectable()
export class AuthPasswordService {
  constructor(
    @Inject(BETTER_AUTH) private readonly auth: BetterAuthPasswordInstance,
  ) {}

  async create(
    nodeHeaders: IncomingHttpHeaders,
    newPassword: string,
  ): Promise<AuthPasswordResponse> {
    try {
      return await this.auth.api.setPassword({
        body: { newPassword },
        headers: toWebHeaders(nodeHeaders),
      });
    } catch (error) {
      const authError = betterAuthErrorDetails(error);

      if (authError.code === 'PASSWORD_ALREADY_SET') {
        throw new ConflictException('Password is already set');
      }

      if (authError.statusCode === 401) {
        throw new UnauthorizedException('Fresh authentication required');
      }

      if (authError.statusCode === 400) {
        throw new BadRequestException('Password does not meet requirements');
      }

      throw error;
    }
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

function betterAuthErrorDetails(error: unknown): {
  code: string | null;
  statusCode: number | null;
} {
  if (!isRecord(error)) return { code: null, statusCode: null };

  const body = isRecord(error.body) ? error.body : null;

  return {
    code: typeof body?.code === 'string' ? body.code : null,
    statusCode: typeof error.statusCode === 'number' ? error.statusCode : null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
