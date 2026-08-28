import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CatalogSessionService } from '../catalog-session.service';
import { ProductDetailService } from './product-detail.service';
import type {
  ProductDetailQuery,
  ProductDetailResponse,
} from './product-detail.types';
import { ProductDetailQueryPipe } from './product-detail.validation';

@Controller('api/v1/catalog/products')
export class ProductDetailController {
  constructor(
    private readonly productDetail: ProductDetailService,
    private readonly catalogSession: CatalogSessionService,
  ) {}

  @Get(':productId')
  async get(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Query(ProductDetailQueryPipe) query: ProductDetailQuery,
    @Req() request: Request,
  ): Promise<ProductDetailResponse> {
    const userId = query.savedVehicleId
      ? await this.catalogSession.requireUserId(request.headers)
      : null;
    return this.productDetail.get(productId, query, userId);
  }
}
