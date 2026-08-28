import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CatalogSessionService } from './catalog-session.service';
import { CatalogService } from './catalog.service';
import type { CatalogQuery, CatalogResponse } from './catalog.types';
import { CatalogQueryPipe } from './catalog.validation';

@Controller('api/v1/catalog/products')
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly catalogSession: CatalogSessionService,
  ) {}

  @Get()
  async list(
    @Query(CatalogQueryPipe) query: CatalogQuery,
    @Req() request: Request,
  ): Promise<CatalogResponse> {
    const userId = query.savedVehicleId
      ? await this.catalogSession.requireUserId(request.headers)
      : null;
    return this.catalogService.list(query, userId);
  }
}
