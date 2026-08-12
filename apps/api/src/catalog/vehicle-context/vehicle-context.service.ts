import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  VehicleContext,
  VehicleContextInput,
} from '../fitment/fitment.types';

@Injectable()
export class VehicleContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    input: VehicleContextInput,
    authenticatedUserId: string | null,
  ): Promise<VehicleContext | null> {
    if (input.savedVehicleId) {
      if (!authenticatedUserId) {
        throw new UnauthorizedException(
          'Authentication required for savedVehicleId',
        );
      }
      const savedVehicle = await this.prisma.savedVehicle.findFirst({
        where: { id: input.savedVehicleId, userId: authenticatedUserId },
        select: { year: true, vehicleGenerationId: true, engineTypeId: true },
      });
      if (!savedVehicle) throw new NotFoundException('Saved vehicle not found');
      return {
        year: savedVehicle.year,
        generationId: savedVehicle.vehicleGenerationId,
        engineTypeId: savedVehicle.engineTypeId,
      };
    }

    if (!input.generationId || input.year === null) return null;
    const generation = await this.prisma.vehicleGeneration.findUnique({
      where: { id: input.generationId },
      select: { yearFrom: true, yearTo: true },
    });
    if (!generation) {
      throw new NotFoundException('Vehicle generation not found');
    }
    if (input.year < generation.yearFrom || input.year > generation.yearTo) {
      throw new BadRequestException(
        'Year is outside the vehicle generation range',
      );
    }
    if (input.engineTypeId) {
      const engine = await this.prisma.engineType.findUnique({
        where: {
          id_vehicleGenerationId: {
            id: input.engineTypeId,
            vehicleGenerationId: input.generationId,
          },
        },
        select: { id: true },
      });
      if (!engine) {
        throw new BadRequestException(
          'Engine does not belong to vehicle generation',
        );
      }
    }
    return {
      year: input.year,
      generationId: input.generationId,
      engineTypeId: input.engineTypeId,
    };
  }
}
