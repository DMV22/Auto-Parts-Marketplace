import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { UserRole } from '../generated/prisma/enums';
import { GarageService } from './garage.service';
import type {
  CreateSavedVehicleInput,
  GarageCollectionResponse,
  GarageItemResponse,
} from './garage.types';
import { GarageCreateBodyPipe } from './garage.validation';

@Controller('api/v1/garage/vehicles')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class GarageController {
  constructor(private readonly garageService: GarageService) {}

  @Get()
  async list(
    @Req() request: AuthenticatedRequest,
  ): Promise<GarageCollectionResponse> {
    return { data: await this.garageService.list(request.auth!.user.id) };
  }

  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body(GarageCreateBodyPipe) input: CreateSavedVehicleInput,
  ): Promise<GarageItemResponse> {
    return {
      data: await this.garageService.create(request.auth!.user.id, input),
    };
  }

  @Put(':id/active')
  async activate(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GarageItemResponse> {
    return {
      data: await this.garageService.activate(request.auth!.user.id, id),
    };
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.garageService.remove(request.auth!.user.id, id);
  }
}
