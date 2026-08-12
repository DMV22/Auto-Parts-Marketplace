import { Controller, Get, Query } from '@nestjs/common';
import { VehicleTaxonomyService } from './vehicle-taxonomy.service';
import type {
  EngineTypeListItem,
  VehicleEnginesQuery,
  VehicleGenerationListItem,
  VehicleGenerationsQuery,
  VehicleMakeListItem,
  VehicleMakesQuery,
  VehicleModelListItem,
  VehicleModelsQuery,
  VehicleTaxonomyCollectionResponse,
} from './vehicle-taxonomy.types';
import { VehicleTaxonomyQueryPipe } from './vehicle-taxonomy.validation';

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

  @Get('makes')
  async getMakes(
    @Query(new VehicleTaxonomyQueryPipe('makes')) query: VehicleMakesQuery,
  ): Promise<VehicleTaxonomyCollectionResponse<VehicleMakeListItem>> {
    return {
      data: await this.vehicleTaxonomyService.getMakes(query.year),
    };
  }

  @Get('models')
  async getModels(
    @Query(new VehicleTaxonomyQueryPipe('models')) query: VehicleModelsQuery,
  ): Promise<VehicleTaxonomyCollectionResponse<VehicleModelListItem>> {
    return {
      data: await this.vehicleTaxonomyService.getModels(
        query.year,
        query.makeId,
      ),
    };
  }

  @Get('generations')
  async getGenerations(
    @Query(new VehicleTaxonomyQueryPipe('generations'))
    query: VehicleGenerationsQuery,
  ): Promise<VehicleTaxonomyCollectionResponse<VehicleGenerationListItem>> {
    return {
      data: await this.vehicleTaxonomyService.getGenerations(
        query.year,
        query.modelId,
      ),
    };
  }

  @Get('engines')
  async getEngines(
    @Query(new VehicleTaxonomyQueryPipe('engines')) query: VehicleEnginesQuery,
  ): Promise<VehicleTaxonomyCollectionResponse<EngineTypeListItem>> {
    return {
      data: await this.vehicleTaxonomyService.getEngines(query.generationId),
    };
  }
}
