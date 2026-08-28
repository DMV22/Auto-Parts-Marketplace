import { GuestCartContextService } from './guest-cart-context.service';

const EXISTING_TOKEN = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const EXISTING_TOKEN_HASH =
  '0f007385b6f9d4b7eeb2748605afe1a984a0a3bfa3f014d09e2a784ce9e5cd1a';

describe('GuestCartContextService', () => {
  const service = new GuestCartContextService();

  it('resolves an existing opaque cookie without rotating it', () => {
    expect(service.resolve(`apm_guest_cart=${EXISTING_TOKEN}`)).toEqual({
      token: EXISTING_TOKEN,
      tokenHash: EXISTING_TOKEN_HASH,
      isNew: false,
    });
  });

  it.each([undefined, 'apm_guest_cart=invalid'])(
    'issues a new opaque context for a missing or invalid cookie: %s',
    (cookieHeader) => {
      const context = service.resolve(cookieHeader);

      expect(context).toEqual({
        token: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        isNew: true,
      });
    },
  );

  it('serializes a 30-day HttpOnly guest cookie', () => {
    expect(service.serialize(EXISTING_TOKEN, false)).toBe(
      `apm_guest_cart=${EXISTING_TOKEN}; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax`,
    );
    expect(service.serialize(EXISTING_TOKEN, true)).toMatch(/; Secure$/);
  });

  it('expires the guest cookie without exposing the previous token', () => {
    expect(service.serializeRemoval(false)).toBe(
      'apm_guest_cart=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax',
    );
  });

  it('calculates the matching 30-day database expiry', () => {
    expect(service.expiresAt(new Date('2026-08-11T12:00:00.000Z'))).toEqual(
      new Date('2026-09-10T12:00:00.000Z'),
    );
  });
});
