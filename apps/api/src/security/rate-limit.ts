import { applyDecorators, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

export const RATE_LIMIT_WINDOW_MS = 60_000;

const TEST_RATE_LIMIT = 1_000_000;
const disableRateLimitsForTests =
  process.env.NODE_ENV === 'test' &&
  process.env.TEST_DISABLE_RATE_LIMITS === 'true';

function configuredRateLimit(limit: number): number {
  return disableRateLimitsForTests ? TEST_RATE_LIMIT : limit;
}

export const DEMO_RATE_LIMITS = {
  auth: configuredRateLimit(10),
  checkout: configuredRateLimit(5),
  mutation: configuredRateLimit(30),
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
