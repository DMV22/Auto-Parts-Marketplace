import { Injectable } from '@nestjs/common';
import { ListingStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import type { FilterOptionsResponse } from './filter-options.types';

const COLLECTION_LIMIT = 100;
const QUERY_LIMIT = COLLECTION_LIMIT + 1;

@Injectable()
export class FilterOptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<FilterOptionsResponse> {
    const publicProductWhere = {
      products: {
        some: {
          variants: {
            some: {
              listings: { some: { status: ListingStatus.ACTIVE } },
            },
          },
        },
      },
    };

    const [brands, categories, currencies] = await Promise.all([
      this.prisma.brand.findMany({
        where: publicProductWhere,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: QUERY_LIMIT,
        select: { id: true, name: true },
      }),
      this.prisma.category.findMany({
        where: publicProductWhere,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: QUERY_LIMIT,
        select: { id: true, name: true },
      }),
      this.prisma.listing.groupBy({
        by: ['currency'],
        where: { status: ListingStatus.ACTIVE },
        orderBy: { currency: 'asc' },
        take: QUERY_LIMIT,
        _min: { price: true },
        _max: { price: true },
      }),
    ]);

    return {
      data: {
        brands: brands.slice(0, COLLECTION_LIMIT),
        categories: categories.slice(0, COLLECTION_LIMIT),
        currencies: currencies.slice(0, COLLECTION_LIMIT).map((currency) => ({
          code: currency.currency,
          minimumPrice: currency._min.price!.toString(),
          maximumPrice: currency._max.price!.toString(),
        })),
      },
      meta: {
        truncated:
          brands.length > COLLECTION_LIMIT ||
          categories.length > COLLECTION_LIMIT ||
          currencies.length > COLLECTION_LIMIT,
      },
    };
  }
}
