import { BadRequestException, PipeTransform } from '@nestjs/common';
import {
  VehicleMakesQuery,
  VehicleTaxonomyQuery,
} from './vehicle-taxonomy.types';

const MINIMUM_VEHICLE_YEAR = 1886;

export class VehicleTaxonomyQueryPipe implements PipeTransform<
  Record<string, unknown>,
  VehicleTaxonomyQuery
> {
  constructor(
    private readonly endpoint: 'makes' | 'models' | 'generations' | 'engines',
  ) {}

  transform(query: Record<string, unknown>): VehicleTaxonomyQuery {
    const allowedKeys =
      this.endpoint === 'makes'
        ? ['year']
        : this.endpoint === 'models'
          ? ['year', 'makeId']
          : this.endpoint === 'generations'
            ? ['year', 'modelId']
            : ['generationId'];
    const unknownKey = Object.keys(query).find(
      (key) => !allowedKeys.includes(key),
    );

    if (unknownKey) {
      throw new BadRequestException(`Unknown query parameter: ${unknownKey}`);
    }

    if (this.endpoint === 'engines') {
      return {
        generationId: this.parseUuid('generationId', query.generationId),
      };
    }

    const yearQuery: VehicleMakesQuery = {
      year: this.parseYear(query.year),
    };

    if (this.endpoint === 'makes') {
      return yearQuery;
    }

    if (this.endpoint === 'models') {
      return {
        ...yearQuery,
        makeId: this.parseUuid('makeId', query.makeId),
      };
    }

    return {
      ...yearQuery,
      modelId: this.parseUuid('modelId', query.modelId),
    };
  }

  private parseYear(value: unknown): number {
    if (typeof value !== 'string' || !/^\d{4}$/.test(value)) {
      throw new BadRequestException('year must be a four-digit integer');
    }

    const year = Number(value);
    const maximumVehicleYear = new Date().getUTCFullYear() + 1;

    if (year < MINIMUM_VEHICLE_YEAR || year > maximumVehicleYear) {
      throw new BadRequestException(
        `year must be between ${MINIMUM_VEHICLE_YEAR} and ${maximumVehicleYear}`,
      );
    }

    return year;
  }

  private parseUuid(name: string, value: unknown): string {
    if (
      typeof value !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
      )
    ) {
      throw new BadRequestException(`${name} must be a UUID`);
    }

    return value;
  }
}
