import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureAuthHttp } from '../src/auth/configure-auth-http';

describe('Better Auth boundary (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    configureAuthHttp(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('exposes the Better Auth session endpoint', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/get-session')
      .expect(200)
      .expect(null);
  });

  it('starts Google OAuth through the Better Auth boundary', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/sign-in/social')
      .send({ provider: 'google', callbackURL: '/' })
      .expect(200);

    expect(response.body.redirect).toBe(true);
    const authorizationUrl = new URL(response.body.url as string);
    expect(authorizationUrl.origin).toBe('https://accounts.google.com');
    expect(authorizationUrl.searchParams.get('client_id')).toBe(
      'test-google-client-id',
    );
    expect(authorizationUrl.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3001/api/auth/callback/google',
    );
  });
});
