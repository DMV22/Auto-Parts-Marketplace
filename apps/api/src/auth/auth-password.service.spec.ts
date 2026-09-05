import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { BetterAuthInstance } from './auth.types';
import { AuthPasswordService } from './auth-password.service';

describe('AuthPasswordService', () => {
  const setPassword = jest.fn();
  const auth = {
    api: { setPassword },
  } as unknown as BetterAuthInstance;
  const service = new AuthPasswordService(auth);

  beforeEach(() => setPassword.mockReset());

  it('creates a credential account through the server-only Better Auth API', async () => {
    setPassword.mockResolvedValue({ status: true });

    await expect(
      service.create(
        { cookie: 'better-auth.session_token=<REDACTED>' },
        'new-password-123',
      ),
    ).resolves.toEqual({ status: true });

    const call = setPassword.mock.calls[0]?.[0] as {
      body: { newPassword: string };
      headers: Headers;
    };
    expect(call.body).toEqual({ newPassword: 'new-password-123' });
    expect(call.headers.get('cookie')).toBe(
      'better-auth.session_token=<REDACTED>',
    );
  });

  it('maps an existing credential race to conflict', async () => {
    setPassword.mockRejectedValue({
      statusCode: 400,
      body: { code: 'PASSWORD_ALREADY_SET' },
    });

    await expect(service.create({}, 'new-password-123')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('requires a fresh authenticated session', async () => {
    setPassword.mockRejectedValue({ statusCode: 401 });

    await expect(service.create({}, 'new-password-123')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
