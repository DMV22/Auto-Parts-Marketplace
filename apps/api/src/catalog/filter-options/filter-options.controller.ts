/* eslint-disable @typescript-eslint/no-unused-vars */
import { Controller, Get, Query } from '@nestjs/common';
import { FilterOptionsService } from './filter-options.service';
import type {
  FilterOptionsQuery,
  FilterOptionsResponse,
} from './filter-options.types';
import { FilterOptionsQueryPipe } from './filter-options.validation';

@Controller('api/v1/catalog/filter-options')
export class FilterOptionsController {
  constructor(private readonly filterOptions: FilterOptionsService) {}

  @Get()
  get(
    @Query(FilterOptionsQueryPipe) _query: FilterOptionsQuery,
  ): Promise<FilterOptionsResponse> {
    return this.filterOptions.get();
  }
}
