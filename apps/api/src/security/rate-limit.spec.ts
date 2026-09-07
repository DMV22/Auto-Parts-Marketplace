import { Controller, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  BETTER_AUTH_RATE_LIMIT,
  DEMO_RATE_LIMITS,
  DemoRateLimit,
} from './rate-limit';
import { SecurityModule } from './security.module';

@Controller('limited')
class LimitedController {
  @Post('auth')
  @DemoRateLimit('auth')
  auth(): { status: string } {
    return { status: 'ok' };
  }

  @Post('checkout')
  @DemoRateLimit('checkout')
  checkout(): { status: string } {
    return { status: 'ok' };
  }

  @Post('mutation')
  @DemoRateLimit('mutation')
  mutation(): { status: string } {
    return { status: 'ok' };
  }
}

describe('DemoRateLimit', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SecurityModule],
      controllers: [LimitedController],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it.each([
    ['auth', DEMO_RATE_LIMITS.auth],
    ['checkout', DEMO_RATE_LIMITS.checkout],
    ['mutation', DEMO_RATE_LIMITS.mutation],
  ] as const)(
    'allows the configured %s budget and rejects the next request',
    async (path, limit) => {
      for (let requestNumber = 0; requestNumber < limit; requestNumber += 1) {
        await request(app.getHttpServer()).post(`/limited/${path}`).expect(201);
      }

      await request(app.getHttpServer()).post(`/limited/${path}`).expect(429);
    },
  );

  it('keeps Better Auth sensitive routes on the auth budget', () => {
    expect(BETTER_AUTH_RATE_LIMIT).toMatchObject({
      enabled: true,
      storage: 'memory',
      customRules: {
        '/sign-in/*': { max: DEMO_RATE_LIMITS.auth, window: 60 },
        '/sign-up/*': { max: DEMO_RATE_LIMITS.auth, window: 60 },
        '/link-social': { max: DEMO_RATE_LIMITS.auth, window: 60 },
      },
    });
  });
});
