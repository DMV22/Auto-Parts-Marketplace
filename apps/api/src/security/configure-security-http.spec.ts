import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureSecurityHttp } from './configure-security-http';

@Controller('security-probe')
class SecurityProbeController {
  @Get()
  get(): { status: string } {
    return { status: 'ok' };
  }
}

describe('configureSecurityHttp', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SecurityProbeController],
    }).compile();

    app = moduleRef.createNestApplication();
    configureSecurityHttp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('adds the baseline security headers without a strict CSP', async () => {
    const response = await request(app.getHttpServer())
      .get('/security-probe')
      .expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['content-security-policy']).toBeUndefined();
  });
});
