import { BadRequestException } from '@nestjs/common';
import { AuthPasswordBodyPipe } from './auth-password.validation';

describe('AuthPasswordBodyPipe', () => {
  const pipe = new AuthPasswordBodyPipe();

  it('accepts only a bounded new password', () => {
    expect(pipe.transform({ newPassword: 'new-password-123' })).toEqual({
      newPassword: 'new-password-123',
    });
  });

  it.each([
    null,
    {},
    { newPassword: 'short' },
    { newPassword: 'valid-password', unexpected: true },
  ])('rejects an invalid password payload', (payload) => {
    expect(() => pipe.transform(payload)).toThrow(BadRequestException);
  });
});
