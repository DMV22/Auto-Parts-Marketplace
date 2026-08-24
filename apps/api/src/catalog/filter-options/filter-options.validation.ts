import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { FilterOptionsQuery } from './filter-options.types';

@Injectable()
export class FilterOptionsQueryPipe implements PipeTransform<
  unknown,
  FilterOptionsQuery
> {
  transform(value: unknown): FilterOptionsQuery {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new BadRequestException('Query parameters must be an object');
    }

    const keys = Object.keys(value);
    if (keys.length > 0) {
      throw new BadRequestException(`Unknown query parameter: ${keys[0]}`);
    }

    return {};
  }
}
