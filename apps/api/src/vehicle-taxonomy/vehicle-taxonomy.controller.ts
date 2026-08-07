import { Controller, Get } from '@nestjs/common';
import { VehicleTaxonomyService } from './vehicle-taxonomy.service';
import { VehicleTaxonomyCollectionResponse } from './vehicle-taxonomy.types';

@Controller('api/v1/vehicles')
export class VehicleTaxonomyController {
  constructor(
    private readonly vehicleTaxonomyService: VehicleTaxonomyService,
  ) {}

  @Get('years')
  async getSupportedYears(): Promise<
    VehicleTaxonomyCollectionResponse<number>
  > {
    return {
      data: await this.vehicleTaxonomyService.getSupportedYears(),
    };
  }
}
