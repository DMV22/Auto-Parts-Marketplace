import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';

const GUEST_CART_COOKIE_NAME = 'apm_guest_cart';
const GUEST_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const GUEST_CART_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export type GuestCartContext = {
  token: string;
  tokenHash: string;
  isNew: boolean;
};

@Injectable()
export class GuestCartContextService {
  hasValidToken(cookieHeader: string | undefined): boolean {
    const token = readCookie(cookieHeader, GUEST_CART_COOKIE_NAME);
    return token !== null && GUEST_TOKEN_PATTERN.test(token);
  }

  resolve(cookieHeader: string | undefined): GuestCartContext {
    const existingToken = readCookie(cookieHeader, GUEST_CART_COOKIE_NAME);
    const isExistingToken =
      existingToken !== null && GUEST_TOKEN_PATTERN.test(existingToken);
    const token = isExistingToken
      ? existingToken
      : randomBytes(32).toString('base64url');

    return {
      token,
      tokenHash: hashToken(token),
      isNew: !isExistingToken,
    };
  }

  serialize(
    token: string,
    secure = process.env.NODE_ENV === 'production',
  ): string {
    const attributes = [
      `${GUEST_CART_COOKIE_NAME}=${token}`,
      `Max-Age=${GUEST_CART_MAX_AGE_SECONDS}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
    ];

    if (secure) {
      attributes.push('Secure');
    }

    return attributes.join('; ');
  }

  serializeRemoval(secure = process.env.NODE_ENV === 'production'): string {
    const attributes = [
      `${GUEST_CART_COOKIE_NAME}=`,
      'Max-Age=0',
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
    ];

    if (secure) {
      attributes.push('Secure');
    }

    return attributes.join('; ');
  }

  expiresAt(from = new Date()): Date {
    return new Date(from.getTime() + GUEST_CART_MAX_AGE_SECONDS * 1000);
  }
}

function readCookie(
  cookieHeader: string | undefined,
  name: string,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const entry of cookieHeader.split(';')) {
    const separatorIndex = entry.indexOf('=');
    if (separatorIndex < 0) {
      continue;
    }

    const cookieName = entry.slice(0, separatorIndex).trim();
    if (cookieName === name) {
      return entry.slice(separatorIndex + 1).trim();
    }
  }

  return null;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
