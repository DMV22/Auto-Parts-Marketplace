import { Module } from '@nestjs/common';
import { VehicleTaxonomyController } from './vehicle-taxonomy.controller';
import { VehicleTaxonomyService } from './vehicle-taxonomy.service';

@Module({
  controllers: [VehicleTaxonomyController],
  providers: [VehicleTaxonomyService],
})
export class VehicleTaxonomyModule {}
