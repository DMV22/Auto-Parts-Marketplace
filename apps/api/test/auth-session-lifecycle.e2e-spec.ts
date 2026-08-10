import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthSessionService } from '../src/auth/auth-session.service';
import { configureAuthHttp } from '../src/auth/configure-auth-http';
import { PrismaService } from '../src/prisma/prisma.service';

const PASSWORD = 'Password-12345';
const NEW_PASSWORD = 'New-Password-67890';
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1_000;

type AuthUser = {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
};

describe('Better Auth session lifecycle (e2e)', () => {
  let app: INestApplication<App>;
  let authSessions: AuthSessionService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    configureAuthHttp(app);
    await app.init();
    authSessions = app.get(AuthSessionService);
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.verification.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma?.session.deleteMany();
    await prisma?.account.deleteMany();
    await prisma?.verification.deleteMany();
    await prisma?.user.deleteMany();
    await app?.close();
  });

  it('persists a session and returns a secure session cookie on sign-up', async () => {
    const client = request.agent(app.getHttpServer());

    const signUp = await client
      .post('/api/auth/sign-up/email')
      .send({
        name: 'Session User',
        email: 'session-user@example.test',
        password: PASSWORD,
      })
      .expect(200);

    const cookies = signUp.headers['set-cookie'] as unknown as string[];
    expect(cookies).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/HttpOnly/i),
        expect.stringMatching(/SameSite=Lax/i),
      ]),
    );
    expect(cookies.join(';')).not.toMatch(/;\s*Secure/i);

    const session = await client.get('/api/auth/get-session').expect(200);

    expect(session.body.user).toMatchObject({
      email: 'session-user@example.test',
      role: 'CUSTOMER',
      isActive: true,
    });
    await expect(
      prisma.session.count({
        where: { userId: (session.body.user as AuthUser).id },
      }),
    ).resolves.toBe(1);

    const persistedSession = await prisma.session.findFirstOrThrow({
      where: { userId: (session.body.user as AuthUser).id },
    });
    const remainingLifetime = persistedSession.expiresAt.getTime() - Date.now();
    expect(remainingLifetime).toBeGreaterThan(6.9 * DAY_IN_MILLISECONDS);
    expect(remainingLifetime).toBeLessThanOrEqual(7 * DAY_IN_MILLISECONDS);
  });

  it('supports email sign-in and deletes the current session on sign-out', async () => {
    const client = request.agent(app.getHttpServer());
    await signUp(client, 'sign-out@example.test');
    await client.post('/api/auth/sign-out').expect(200);
    await client.get('/api/auth/get-session').expect(200).expect(null);

    await client
      .post('/api/auth/sign-in/email')
      .send({ email: 'sign-out@example.test', password: PASSWORD })
      .expect(200);
    await client.get('/api/auth/get-session').expect(200);
  });

  it('rejects invalid and expired sessions', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/get-session')
      .set('Cookie', 'better-auth.session_token=invalid-token')
      .expect(200)
      .expect(null);

    const client = request.agent(app.getHttpServer());
    const user = await signUp(client, 'expired@example.test');
    await prisma.session.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    await client.get('/api/auth/get-session').expect(200).expect(null);
  });

  it('refreshes an active session after the 24-hour update threshold', async () => {
    const client = request.agent(app.getHttpServer());
    const user = await signUp(client, 'refresh@example.test');
    const staleExpiry = new Date(Date.now() + 5 * DAY_IN_MILLISECONDS);
    await prisma.session.updateMany({
      where: { userId: user.id },
      data: { expiresAt: staleExpiry },
    });

    await client.get('/api/auth/get-session').expect(200);

    const refreshedSession = await prisma.session.findFirstOrThrow({
      where: { userId: user.id },
    });
    expect(refreshedSession.expiresAt.getTime()).toBeGreaterThan(
      Date.now() + 6.9 * DAY_IN_MILLISECONDS,
    );
  });

  it('rotates the current session and revokes every other session on password change', async () => {
    const firstClient = request.agent(app.getHttpServer());
    const secondClient = request.agent(app.getHttpServer());
    const user = await signUp(firstClient, 'password-change@example.test');
    await secondClient
      .post('/api/auth/sign-in/email')
      .send({ email: user.email, password: PASSWORD })
      .expect(200);

    await firstClient
      .post('/api/auth/change-password')
      .send({
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
        revokeOtherSessions: false,
      })
      .expect(200);

    await firstClient.get('/api/auth/get-session').expect(200);
    await secondClient.get('/api/auth/get-session').expect(200).expect(null);
    await expect(
      prisma.session.count({ where: { userId: user.id } }),
    ).resolves.toBe(1);
  });

  it('revokes every session and prevents new sessions when a user is blocked', async () => {
    const firstClient = request.agent(app.getHttpServer());
    const secondClient = request.agent(app.getHttpServer());
    const user = await signUp(firstClient, 'blocked@example.test');
    await secondClient
      .post('/api/auth/sign-in/email')
      .send({ email: user.email, password: PASSWORD })
      .expect(200);

    await authSessions.blockUser(user.id);

    await firstClient.get('/api/auth/get-session').expect(200).expect(null);
    await secondClient.get('/api/auth/get-session').expect(200).expect(null);
    await expect(
      prisma.session.count({ where: { userId: user.id } }),
    ).resolves.toBe(0);
    await firstClient
      .post('/api/auth/sign-in/email')
      .send({ email: user.email, password: PASSWORD })
      .expect(403);
  });
});

async function signUp(
  client: ReturnType<typeof request.agent>,
  email: string,
): Promise<AuthUser> {
  const response = await client
    .post('/api/auth/sign-up/email')
    .send({ name: 'Session User', email, password: PASSWORD })
    .expect(200);

  return response.body.user as AuthUser;
}
