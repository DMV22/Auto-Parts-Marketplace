/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}
