import { Injectable, NotFoundException } from '@nestjs/common';
import { ListingStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { FitmentService } from '../fitment/fitment.service';
import type {
  ProductDetailQuery,
  ProductDetailResponse,
} from './product-detail.types';
import { VehicleContextService } from '../vehicle-context/vehicle-context.service';

@Injectable()
export class ProductDetailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vehicleContexts: VehicleContextService,
    private readonly fitment: FitmentService,
  ) {}

  async get(
    productId: string,
    query: ProductDetailQuery,
    authenticatedUserId: string | null,
  ): Promise<ProductDetailResponse> {
    const vehicle = await this.vehicleContexts.resolve(
      query,
      authenticatedUserId,
    );
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        description: true,
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        variants: {
          where: { listings: { some: { status: ListingStatus.ACTIVE } } },
          orderBy: [{ sku: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            sku: true,
            manufacturerPartNumber: true,
            oemNumber: true,
            fitmentRules: {
              where: vehicle
                ? { vehicleGenerationId: vehicle.generationId }
                : { id: { in: [] } },
              select: {
                id: true,
                effect: true,
                vehicleGenerationId: true,
                engineTypeId: true,
              },
            },
            listings: {
              where: { status: ListingStatus.ACTIVE },
              orderBy: [{ price: 'asc' }, { id: 'asc' }],
              select: {
                id: true,
                condition: true,
                price: true,
                currency: true,
                stockQuantity: true,
                supplier: { select: { id: true, name: true, slug: true } },
              },
            },
          },
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (product.variants.length === 0) {
      throw new NotFoundException('Product is not publicly available');
    }

    return {
      data: {
        id: product.id,
        name: product.name,
        description: product.description,
        brand: product.brand,
        category: product.category,
        variants: product.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          manufacturerPartNumber: variant.manufacturerPartNumber,
          oemNumber: variant.oemNumber,
          fitment: this.fitment.evaluate(vehicle, variant.fitmentRules),
          listings: variant.listings.map((listing) => ({
            id: listing.id,
            condition: listing.condition,
            price: listing.price.toString(),
            currency: listing.currency,
            inStock: listing.stockQuantity > 0,
            supplier: listing.supplier,
          })),
        })),
      },
    };
  }
}
