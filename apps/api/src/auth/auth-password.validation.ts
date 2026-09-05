import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { CreateAuthPasswordInput } from './auth-password.types';

const PASSWORD_KEYS = new Set(['newPassword']);
const MINIMUM_PASSWORD_LENGTH = 8;
const MAXIMUM_PASSWORD_LENGTH = 128;

@Injectable()
export class AuthPasswordBodyPipe implements PipeTransform<
  unknown,
  CreateAuthPasswordInput
> {
  transform(value: unknown): CreateAuthPasswordInput {
    if (!isRecord(value)) {
      throw new BadRequestException('Request body must be an object');
    }

    const unknownKey = Object.keys(value).find(
      (key) => !PASSWORD_KEYS.has(key),
    );
    if (unknownKey) {
      throw new BadRequestException(`Unknown body field: ${unknownKey}`);
    }

    if (
      typeof value.newPassword !== 'string' ||
      value.newPassword.length < MINIMUM_PASSWORD_LENGTH ||
      value.newPassword.length > MAXIMUM_PASSWORD_LENGTH
    ) {
      throw new BadRequestException(
        `newPassword must contain between ${MINIMUM_PASSWORD_LENGTH} and ${MAXIMUM_PASSWORD_LENGTH} characters`,
      );
    }

    return { newPassword: value.newPassword };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
