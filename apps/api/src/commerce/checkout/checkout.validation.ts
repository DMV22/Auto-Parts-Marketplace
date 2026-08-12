import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class CheckoutIdempotencyKeyPipe implements PipeTransform<
  unknown,
  string
> {
  transform(value: unknown): string {
    if (typeof value !== 'string' || !UUID_V4.test(value)) {
      throw new BadRequestException('Idempotency-Key must be a valid UUID v4');
    }

    return value.toLowerCase();
  }
}

@Injectable()
export class CheckoutBodyPipe implements PipeTransform<
  unknown,
  Record<string, never>
> {
  transform(value: unknown): Record<string, never> {
    if (value === undefined) return {};
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value) ||
      Object.keys(value).length > 0
    ) {
      throw new BadRequestException('Checkout body must be empty');
    }

    return {};
  }
}
