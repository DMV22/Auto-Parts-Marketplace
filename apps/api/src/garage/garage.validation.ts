import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { CreateSavedVehicleInput } from './garage.types';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_KEYS = new Set([
  'year',
  'vehicleGenerationId',
  'engineTypeId',
  'label',
]);

@Injectable()
export class GarageCreateBodyPipe implements PipeTransform<
  unknown,
  CreateSavedVehicleInput
> {
  transform(value: unknown): CreateSavedVehicleInput {
    if (!isRecord(value)) {
      throw new BadRequestException('Request body must be an object');
    }

    const unknownKey = Object.keys(value).find((key) => !ALLOWED_KEYS.has(key));
    if (unknownKey) {
      throw new BadRequestException(`Unknown body field: ${unknownKey}`);
    }

    const maximumYear = new Date().getUTCFullYear() + 1;
    if (
      !Number.isInteger(value.year) ||
      (value.year as number) < 1886 ||
      (value.year as number) > maximumYear
    ) {
      throw new BadRequestException(
        `year must be an integer between 1886 and ${maximumYear}`,
      );
    }

    if (!isUuid(value.vehicleGenerationId)) {
      throw new BadRequestException('vehicleGenerationId must be a UUID');
    }
    if (
      value.engineTypeId !== undefined &&
      value.engineTypeId !== null &&
      !isUuid(value.engineTypeId)
    ) {
      throw new BadRequestException('engineTypeId must be a UUID or null');
    }

    let label: string | null = null;
    if (value.label !== undefined && value.label !== null) {
      if (typeof value.label !== 'string') {
        throw new BadRequestException('label must be a string or null');
      }
      label = value.label.trim();
      if (label.length === 0 || label.length > 80) {
        throw new BadRequestException(
          'label must contain between 1 and 80 characters',
        );
      }
    }

    return {
      year: value.year as number,
      vehicleGenerationId: value.vehicleGenerationId,
      engineTypeId: value.engineTypeId ?? null,
      label,
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}
