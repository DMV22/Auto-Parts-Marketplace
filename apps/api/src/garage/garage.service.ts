import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSavedVehicleInput, GarageVehicle } from './garage.types';

const SAVED_VEHICLE_SELECT = {
  id: true,
  year: true,
  label: true,
  vehicleGeneration: {
    select: {
      id: true,
      code: true,
      name: true,
      yearFrom: true,
      yearTo: true,
      vehicleModel: {
        select: {
          id: true,
          name: true,
          vehicleMake: { select: { id: true, name: true } },
        },
      },
    },
  },
  engineType: { select: { id: true, code: true, name: true } },
} satisfies Prisma.SavedVehicleSelect;

type SavedVehicleProjection = Prisma.SavedVehicleGetPayload<{
  select: typeof SAVED_VEHICLE_SELECT;
}>;

@Injectable()
export class GarageService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<GarageVehicle[]> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        activeSavedVehicleId: true,
        savedVehicles: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: SAVED_VEHICLE_SELECT,
        },
      },
    });

    return user.savedVehicles.map((vehicle) =>
      toGarageVehicle(vehicle, user.activeSavedVehicleId === vehicle.id),
    );
  }

  async create(
    userId: string,
    input: CreateSavedVehicleInput,
  ): Promise<GarageVehicle> {
    try {
      const savedVehicle = await this.prisma.$transaction(
        async (transaction) => {
          const generation = await transaction.vehicleGeneration.findUnique({
            where: { id: input.vehicleGenerationId },
            select: { yearFrom: true, yearTo: true },
          });
          if (!generation) {
            throw new NotFoundException('Vehicle generation not found');
          }
          if (
            input.year < generation.yearFrom ||
            input.year > generation.yearTo
          ) {
            throw new BadRequestException(
              'Year is outside the vehicle generation range',
            );
          }

          if (input.engineTypeId) {
            const engine = await transaction.engineType.findUnique({
              where: {
                id_vehicleGenerationId: {
                  id: input.engineTypeId,
                  vehicleGenerationId: input.vehicleGenerationId,
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

          const duplicate = await transaction.savedVehicle.findFirst({
            where: {
              userId,
              year: input.year,
              vehicleGenerationId: input.vehicleGenerationId,
              engineTypeId: input.engineTypeId,
            },
            select: { id: true },
          });
          if (duplicate) {
            throw new ConflictException('Saved vehicle already exists');
          }

          return transaction.savedVehicle.create({
            data: { userId, ...input },
            select: SAVED_VEHICLE_SELECT,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return toGarageVehicle(savedVehicle, false);
    } catch (error: unknown) {
      if (hasPrismaCode(error, 'P2034')) {
        throw new ConflictException('Saved vehicle already exists');
      }
      throw error;
    }
  }

  async activate(
    userId: string,
    savedVehicleId: string,
  ): Promise<GarageVehicle> {
    return this.prisma.$transaction(async (transaction) => {
      const vehicle = await transaction.savedVehicle.findFirst({
        where: { id: savedVehicleId, userId },
        select: SAVED_VEHICLE_SELECT,
      });
      if (!vehicle) {
        throw new NotFoundException('Saved vehicle not found');
      }

      await transaction.user.update({
        where: { id: userId },
        data: { activeSavedVehicleId: savedVehicleId },
      });
      return toGarageVehicle(vehicle, true);
    });
  }

  async remove(userId: string, savedVehicleId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const vehicle = await transaction.savedVehicle.findFirst({
        where: { id: savedVehicleId, userId },
        select: { id: true },
      });
      if (!vehicle) {
        throw new NotFoundException('Saved vehicle not found');
      }
      await transaction.savedVehicle.delete({ where: { id: savedVehicleId } });
    });
  }
}

function toGarageVehicle(
  vehicle: SavedVehicleProjection,
  isActive: boolean,
): GarageVehicle {
  return {
    id: vehicle.id,
    year: vehicle.year,
    label: vehicle.label,
    isActive,
    generation: {
      id: vehicle.vehicleGeneration.id,
      code: vehicle.vehicleGeneration.code,
      name: vehicle.vehicleGeneration.name,
      yearFrom: vehicle.vehicleGeneration.yearFrom,
      yearTo: vehicle.vehicleGeneration.yearTo,
      model: {
        id: vehicle.vehicleGeneration.vehicleModel.id,
        name: vehicle.vehicleGeneration.vehicleModel.name,
        make: vehicle.vehicleGeneration.vehicleModel.vehicleMake,
      },
    },
    engine: vehicle.engineType,
  };
}

function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
