import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  SupplierProductVariantCursor,
  SupplierProductVariantDetailResponse,
  SupplierProductVariantDto,
  SupplierProductVariantsQuery,
  SupplierProductVariantsResponse,
} from './product-variants.types';
import { encodeSupplierProductVariantCursor } from './product-variants.validation';

const PRODUCT_VARIANT_SELECT = {
  id: true,
  sku: true,
  manufacturerPartNumber: true,
  oemNumber: true,
  product: {
    select: {
      id: true,
      name: true,
      brand: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.ProductVariantSelect;

type SelectedProductVariant = Prisma.ProductVariantGetPayload<{
  select: typeof PRODUCT_VARIANT_SELECT;
}>;

@Injectable()
export class SupplierProductVariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: SupplierProductVariantsQuery,
  ): Promise<SupplierProductVariantsResponse> {
    const rows = await this.prisma.productVariant.findMany({
      where: {
        AND: [searchWhere(query.query), cursorWhere(query.cursor)].filter(
          (clause): clause is Prisma.ProductVariantWhereInput =>
            Boolean(clause),
        ),
      },
      orderBy: [{ product: { name: 'asc' } }, { sku: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
      select: PRODUCT_VARIANT_SELECT,
    });
    const hasNextPage = rows.length > query.limit;
    const page = hasNextPage ? rows.slice(0, query.limit) : rows;
    const last = page.at(-1);

    return {
      data: page.map(mapProductVariant),
      pageInfo: {
        hasNextPage,
        nextCursor:
          hasNextPage && last
            ? encodeSupplierProductVariantCursor({
                version: 1,
                query: query.query,
                productName: last.product.name,
                sku: last.sku,
                id: last.id,
              })
            : null,
      },
    };
  }

  async detail(
    productVariantId: string,
  ): Promise<SupplierProductVariantDetailResponse> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: productVariantId },
      select: PRODUCT_VARIANT_SELECT,
    });
    if (!variant) throw new NotFoundException('Product variant not found');
    return { data: mapProductVariant(variant) };
  }
}

function searchWhere(
  query: string | null,
): Prisma.ProductVariantWhereInput | null {
  if (!query) return null;
  return {
    OR: [
      { sku: { contains: query, mode: 'insensitive' } },
      { manufacturerPartNumber: { contains: query, mode: 'insensitive' } },
      { oemNumber: { contains: query, mode: 'insensitive' } },
      { product: { name: { contains: query, mode: 'insensitive' } } },
    ],
  };
}

function cursorWhere(
  cursor: SupplierProductVariantCursor | null,
): Prisma.ProductVariantWhereInput | null {
  if (!cursor) return null;
  return {
    OR: [
      { product: { name: { gt: cursor.productName } } },
      {
        product: { name: cursor.productName },
        sku: { gt: cursor.sku },
      },
      {
        product: { name: cursor.productName },
        sku: cursor.sku,
        id: { gt: cursor.id },
      },
    ],
  };
}

function mapProductVariant(
  variant: SelectedProductVariant,
): SupplierProductVariantDto {
  return variant;
}
