/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  EngineTypeListItem,
  VehicleGenerationListItem,
  VehicleMakeListItem,
  VehicleModelListItem,
} from './vehicle-taxonomy.types';

@Injectable()
export class VehicleTaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  async getSupportedYears(): Promise<number[]> {
    const generations = await this.prisma.vehicleGeneration.findMany({
      select: {
        yearFrom: true,
        yearTo: true,
      },
    });
    const years = new Set<number>();

    for (const generation of generations) {
      for (
        let year = generation.yearFrom;
        year <= generation.yearTo;
        year += 1
      ) {
        years.add(year);
      }
    }

    return [...years].sort((left, right) => right - left);
  }

  getMakes(year: number): Promise<VehicleMakeListItem[]> {
    return this.prisma.vehicleMake.findMany({
      where: {
        models: {
          some: {
            generations: {
              some: {
                yearFrom: { lte: year },
                yearTo: { gte: year },
              },
            },
          },
        },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true },
    });
  }

  async getModels(
    year: number,
    makeId: string,
  ): Promise<VehicleModelListItem[]> {
    const models = await this.prisma.vehicleModel.findMany({
      where: {
        vehicleMakeId: makeId,
        generations: {
          some: {
            yearFrom: { lte: year },
            yearTo: { gte: year },
          },
        },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true },
    });

    if (models.length === 0) {
      const make = await this.prisma.vehicleMake.findUnique({
        where: { id: makeId },
        select: { id: true },
      });

      if (!make) {
        throw new NotFoundException('Vehicle make not found');
      }
    }

    return models;
  }

  async getGenerations(
    year: number,
    modelId: string,
  ): Promise<VehicleGenerationListItem[]> {
    const generations = await this.prisma.vehicleGeneration.findMany({
      where: {
        vehicleModelId: modelId,
        yearFrom: { lte: year },
        yearTo: { gte: year },
      },
      orderBy: [{ code: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        yearFrom: true,
        yearTo: true,
      },
    });

    if (generations.length === 0) {
      const model = await this.prisma.vehicleModel.findUnique({
        where: { id: modelId },
        select: { id: true },
      });

      if (!model) {
        throw new NotFoundException('Vehicle model not found');
      }
    }

    return generations;
  }

  async getEngines(generationId: string): Promise<EngineTypeListItem[]> {
    const engines = await this.prisma.engineType.findMany({
      where: { vehicleGenerationId: generationId },
      orderBy: [{ name: 'asc' }, { code: 'asc' }, { id: 'asc' }],
      select: { id: true, code: true, name: true },
    });

    if (engines.length === 0) {
      const generation = await this.prisma.vehicleGeneration.findUnique({
        where: { id: generationId },
        select: { id: true },
      });

      if (!generation) {
        throw new NotFoundException('Vehicle generation not found');
      }
    }

    return engines;
  }
}
