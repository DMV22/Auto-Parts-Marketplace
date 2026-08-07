import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { ListingStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CatalogProduct,
  CatalogQuery,
  CatalogResponse,
  VehicleContext,
} from './catalog.types';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: CatalogQuery,
    authenticatedUserId: string | null,
  ): Promise<CatalogResponse> {
    const vehicle = await this.resolveVehicleContext(
      query,
      authenticatedUserId,
    );
    const listingWhere = buildListingWhere(query);
    const variantWhere = buildVariantWhere(listingWhere, vehicle);
    const productWhere = buildProductWhere(query, variantWhere);
    const total = await this.prisma.product.count({ where: productWhere });
    const skip = (query.page - 1) * query.pageSize;

    const productIds = query.sort.startsWith('price_')
      ? await this.findPriceSortedProductIds(query, vehicle, skip)
      : null;
    const products = await this.prisma.product.findMany({
      where: productIds ? { id: { in: productIds } } : productWhere,
      orderBy: productIds ? undefined : productOrderBy(query),
      skip: productIds ? undefined : skip,
      take: productIds ? undefined : query.pageSize,
      select: {
        id: true,
        name: true,
        description: true,
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        variants: {
          where: variantWhere,
          orderBy: [{ sku: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            sku: true,
            manufacturerPartNumber: true,
            oemNumber: true,
            listings: {
              where: listingWhere,
              orderBy: [{ price: 'asc' }, { id: 'asc' }],
              select: {
                id: true,
                condition: true,
                price: true,
                currency: true,
                stockQuantity: true,
              },
            },
          },
        },
      },
    });
    const order = new Map(productIds?.map((id, index) => [id, index]));
    if (productIds) {
      products.sort(
        (left, right) => order.get(left.id)! - order.get(right.id)!,
      );
    }

    return {
      data: products.map((product) => mapProduct(product, query.currency)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
        sort: query.sort,
      },
    };
  }

  private async resolveVehicleContext(
    query: CatalogQuery,
    authenticatedUserId: string | null,
  ): Promise<VehicleContext | null> {
    if (query.savedVehicleId) {
      if (!authenticatedUserId) {
        throw new UnauthorizedException(
          'Authentication required for savedVehicleId',
        );
      }
      const savedVehicle = await this.prisma.savedVehicle.findFirst({
        where: { id: query.savedVehicleId, userId: authenticatedUserId },
        select: { year: true, vehicleGenerationId: true, engineTypeId: true },
      });
      if (!savedVehicle) {
        throw new NotFoundException('Saved vehicle not found');
      }
      return {
        year: savedVehicle.year,
        generationId: savedVehicle.vehicleGenerationId,
        engineTypeId: savedVehicle.engineTypeId,
      };
    }

    if (!query.generationId || query.year === null) return null;
    const generation = await this.prisma.vehicleGeneration.findUnique({
      where: { id: query.generationId },
      select: { yearFrom: true, yearTo: true },
    });
    if (!generation) {
      throw new NotFoundException('Vehicle generation not found');
    }
    if (query.year < generation.yearFrom || query.year > generation.yearTo) {
      throw new BadRequestException(
        'Year is outside the vehicle generation range',
      );
    }
    if (query.engineTypeId) {
      const engine = await this.prisma.engineType.findUnique({
        where: {
          id_vehicleGenerationId: {
            id: query.engineTypeId,
            vehicleGenerationId: query.generationId,
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
      year: query.year,
      generationId: query.generationId,
      engineTypeId: query.engineTypeId,
    };
  }

  private async findPriceSortedProductIds(
    query: CatalogQuery,
    vehicle: VehicleContext | null,
    skip: number,
  ): Promise<string[]> {
    const clauses = buildSqlClauses(query, vehicle);
    const direction =
      query.sort === 'price_asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT product.id
      FROM "Product" AS product
      JOIN "Brand" AS brand ON brand.id = product."brandId"
      JOIN "ProductVariant" AS variant ON variant."productId" = product.id
      JOIN "Listing" AS listing ON listing."productVariantId" = variant.id
      WHERE ${Prisma.join(clauses, ' AND ')}
      GROUP BY product.id
      ORDER BY MIN(listing.price) ${direction}, product.id ASC
      LIMIT ${query.pageSize}
      OFFSET ${skip}
    `);
    return rows.map(({ id }) => id);
  }
}

function buildListingWhere(query: CatalogQuery): Prisma.ListingWhereInput {
  return {
    status: ListingStatus.ACTIVE,
    condition: query.condition ?? undefined,
    currency: query.currency ?? undefined,
    price:
      query.minPrice || query.maxPrice
        ? {
            gte: query.minPrice ?? undefined,
            lte: query.maxPrice ?? undefined,
          }
        : undefined,
    stockQuantity:
      query.inStock === true
        ? { gt: 0 }
        : query.inStock === false
          ? { equals: 0 }
          : undefined,
  };
}

function buildVariantWhere(
  listingWhere: Prisma.ListingWhereInput,
  vehicle: VehicleContext | null,
): Prisma.ProductVariantWhereInput {
  return {
    listings: { some: listingWhere },
    fitmentRules: vehicle
      ? {
          some: {
            vehicleGenerationId: vehicle.generationId,
            ...(vehicle.engineTypeId
              ? {
                  OR: [
                    { engineTypeId: vehicle.engineTypeId },
                    { engineTypeId: null },
                  ],
                }
              : { engineTypeId: null }),
          },
        }
      : undefined,
  };
}

function buildProductWhere(
  query: CatalogQuery,
  variantWhere: Prisma.ProductVariantWhereInput,
): Prisma.ProductWhereInput {
  const text = query.q
    ? { contains: query.q, mode: Prisma.QueryMode.insensitive }
    : null;
  return {
    categoryId: query.categoryId ?? undefined,
    brandId: query.brandId ?? undefined,
    variants: { some: variantWhere },
    OR: text
      ? [
          { name: text },
          { description: text },
          { brand: { name: text } },
          {
            variants: {
              some: {
                AND: [
                  variantWhere,
                  {
                    OR: [
                      { sku: text },
                      { manufacturerPartNumber: text },
                      { oemNumber: text },
                    ],
                  },
                ],
              },
            },
          },
        ]
      : undefined,
  };
}

function productOrderBy(
  query: CatalogQuery,
): Prisma.ProductOrderByWithRelationInput[] {
  switch (query.sort) {
    case 'name_asc':
      return [{ name: 'asc' }, { id: 'asc' }];
    case 'name_desc':
      return [{ name: 'desc' }, { id: 'asc' }];
    default:
      return [{ createdAt: 'desc' }, { id: 'desc' }];
  }
}

function buildSqlClauses(
  query: CatalogQuery,
  vehicle: VehicleContext | null,
): Prisma.Sql[] {
  const clauses: Prisma.Sql[] = [
    Prisma.sql`listing.status = 'ACTIVE'::"ListingStatus"`,
  ];
  if (query.categoryId)
    clauses.push(Prisma.sql`product."categoryId" = ${query.categoryId}::uuid`);
  if (query.brandId)
    clauses.push(Prisma.sql`product."brandId" = ${query.brandId}::uuid`);
  if (query.condition)
    clauses.push(
      Prisma.sql`listing.condition = ${query.condition}::"ListingCondition"`,
    );
  if (query.currency)
    clauses.push(Prisma.sql`listing.currency = ${query.currency}`);
  if (query.minPrice)
    clauses.push(Prisma.sql`listing.price >= ${query.minPrice}::numeric`);
  if (query.maxPrice)
    clauses.push(Prisma.sql`listing.price <= ${query.maxPrice}::numeric`);
  if (query.inStock === true)
    clauses.push(Prisma.sql`listing."stockQuantity" > 0`);
  if (query.inStock === false)
    clauses.push(Prisma.sql`listing."stockQuantity" = 0`);
  if (vehicle) {
    clauses.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "FitmentRule" AS fitment
      WHERE fitment."productVariantId" = variant.id
        AND fitment."vehicleGenerationId" = ${vehicle.generationId}::uuid
        AND ${
          vehicle.engineTypeId
            ? Prisma.sql`(fitment."engineTypeId" = ${vehicle.engineTypeId}::uuid OR fitment."engineTypeId" IS NULL)`
            : Prisma.sql`fitment."engineTypeId" IS NULL`
        }
    )`);
  }
  if (query.q) {
    const pattern = `%${escapeLike(query.q)}%`;
    const searchListingClauses = buildSearchListingClauses(query);
    const searchFitmentClause = vehicle
      ? Prisma.sql`AND EXISTS (
          SELECT 1 FROM "FitmentRule" AS search_fitment
          WHERE search_fitment."productVariantId" = search_variant.id
            AND search_fitment."vehicleGenerationId" = ${vehicle.generationId}::uuid
            AND ${
              vehicle.engineTypeId
                ? Prisma.sql`(search_fitment."engineTypeId" = ${vehicle.engineTypeId}::uuid OR search_fitment."engineTypeId" IS NULL)`
                : Prisma.sql`search_fitment."engineTypeId" IS NULL`
            }
        )`
      : Prisma.empty;
    clauses.push(Prisma.sql`(
      product.name ILIKE ${pattern} ESCAPE '\\'
      OR product.description ILIKE ${pattern} ESCAPE '\\'
      OR brand.name ILIKE ${pattern} ESCAPE '\\'
      OR EXISTS (
        SELECT 1
        FROM "ProductVariant" AS search_variant
        JOIN "Listing" AS search_listing
          ON search_listing."productVariantId" = search_variant.id
        WHERE search_variant."productId" = product.id
          AND ${Prisma.join(searchListingClauses, ' AND ')}
          ${searchFitmentClause}
          AND (
            search_variant.sku ILIKE ${pattern} ESCAPE '\\'
            OR search_variant."manufacturerPartNumber" ILIKE ${pattern} ESCAPE '\\'
            OR search_variant."oemNumber" ILIKE ${pattern} ESCAPE '\\'
          )
      )
    )`);
  }
  return clauses;
}

function buildSearchListingClauses(query: CatalogQuery): Prisma.Sql[] {
  const clauses: Prisma.Sql[] = [
    Prisma.sql`search_listing.status = 'ACTIVE'::"ListingStatus"`,
  ];
  if (query.condition) {
    clauses.push(
      Prisma.sql`search_listing.condition = ${query.condition}::"ListingCondition"`,
    );
  }
  if (query.currency) {
    clauses.push(Prisma.sql`search_listing.currency = ${query.currency}`);
  }
  if (query.minPrice) {
    clauses.push(
      Prisma.sql`search_listing.price >= ${query.minPrice}::numeric`,
    );
  }
  if (query.maxPrice) {
    clauses.push(
      Prisma.sql`search_listing.price <= ${query.maxPrice}::numeric`,
    );
  }
  if (query.inStock === true) {
    clauses.push(Prisma.sql`search_listing."stockQuantity" > 0`);
  }
  if (query.inStock === false) {
    clauses.push(Prisma.sql`search_listing."stockQuantity" = 0`);
  }
  return clauses;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

function mapProduct(
  product: {
    id: string;
    name: string;
    description: string | null;
    brand: { id: string; name: string };
    category: { id: string; name: string } | null;
    variants: Array<{
      id: string;
      sku: string;
      manufacturerPartNumber: string;
      oemNumber: string | null;
      listings: Array<{
        id: string;
        condition: CatalogProduct['variants'][number]['listings'][number]['condition'];
        price: { toString(): string };
        currency: string;
        stockQuantity: number;
      }>;
    }>;
  },
  currency: string | null,
): CatalogProduct {
  const listings = product.variants.flatMap((variant) => variant.listings);
  const minimum = currency
    ? listings.reduce<(typeof listings)[number] | null>(
        (current, listing) =>
          !current || Number(listing.price) < Number(current.price)
            ? listing
            : current,
        null,
      )
    : null;
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    brand: product.brand,
    category: product.category,
    minimumPrice: minimum
      ? { amount: minimum.price.toString(), currency: minimum.currency }
      : null,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      manufacturerPartNumber: variant.manufacturerPartNumber,
      oemNumber: variant.oemNumber,
      listings: variant.listings.map((listing) => ({
        id: listing.id,
        condition: listing.condition,
        price: listing.price.toString(),
        currency: listing.currency,
        inStock: listing.stockQuantity > 0,
      })),
    })),
  };
}
