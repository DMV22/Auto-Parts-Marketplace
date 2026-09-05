import { applyDecorators, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

export const RATE_LIMIT_WINDOW_MS = 60_000;

export const DEMO_RATE_LIMITS = {
  auth: 10,
  checkout: 5,
  mutation: 30,
} as const;

export const BETTER_AUTH_RATE_LIMIT = {
  enabled: true,
  max: 100,
  window: 60,
  storage: 'memory',
  customRules: {
    '/sign-in/*': { max: DEMO_RATE_LIMITS.auth, window: 60 },
    '/sign-up/*': { max: DEMO_RATE_LIMITS.auth, window: 60 },
    '/link-social': { max: DEMO_RATE_LIMITS.auth, window: 60 },
  },
} as const;

type DemoRateLimit = keyof typeof DEMO_RATE_LIMITS;

export function DemoRateLimit(policy: DemoRateLimit): MethodDecorator {
  return applyDecorators(
    Throttle({
      default: {
        limit: DEMO_RATE_LIMITS[policy],
        ttl: RATE_LIMIT_WINDOW_MS,
      },
    }),
    UseGuards(ThrottlerGuard),
  );
}
