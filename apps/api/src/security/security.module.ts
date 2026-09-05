import { Global, Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { DEMO_RATE_LIMITS, RATE_LIMIT_WINDOW_MS } from './rate-limit';

@Global()
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        limit: DEMO_RATE_LIMITS.mutation,
        ttl: RATE_LIMIT_WINDOW_MS,
      },
    ]),
  ],
  exports: [ThrottlerModule],
})
export class SecurityModule {}
