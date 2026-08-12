import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { ListingStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateSupplierListing,
  SupplierListingCursor,
  SupplierListingDto,
  SupplierListingsQuery,
  SupplierListingsResponse,
  UpdateSupplierListing,
} from './listings.types';
import { encodeSupplierListingCursor } from './listings.validation';

const LISTING_SELECT = {
  id: true,
  supplierId: true,
  status: true,
  condition: true,
  price: true,
  currency: true,
  stockQuantity: true,
  createdAt: true,
  updatedAt: true,
  productVariant: {
    select: {
      id: true,
      sku: true,
      manufacturerPartNumber: true,
      oemNumber: true,
    },
  },
} satisfies Prisma.ListingSelect;

type SelectedListing = Prisma.ListingGetPayload<{
  select: typeof LISTING_SELECT;
}>;

@Injectable()
export class SupplierListingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    supplierId: string,
    query: SupplierListingsQuery,
  ): Promise<SupplierListingsResponse> {
    const rows = await this.prisma.listing.findMany({
      where: {
        supplierId,
        status: query.status ?? undefined,
        condition: query.condition ?? undefined,
        productVariantId: query.productVariantId ?? undefined,
        AND: query.cursor ? [cursorWhere(query.cursor)] : undefined,
      },
      orderBy: listingOrderBy(query),
      take: query.pageSize + 1,
      select: LISTING_SELECT,
    });
    const hasNextPage = rows.length > query.pageSize;
    const page = hasNextPage ? rows.slice(0, query.pageSize) : rows;
    const last = page.at(-1);

    return {
      data: page.map(mapListing),
      meta: {
        pageSize: query.pageSize,
        nextCursor:
          hasNextPage && last
            ? encodeSupplierListingCursor(cursorFromListing(last, query))
            : null,
        sort: query.sort,
      },
    };
  }

  async get(
    supplierId: string,
    listingId: string,
  ): Promise<SupplierListingDto> {
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, supplierId },
      select: LISTING_SELECT,
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return mapListing(listing);
  }

  async create(
    supplierId: string,
    command: CreateSupplierListing,
  ): Promise<SupplierListingDto> {
    const [supplier, variant] = await Promise.all([
      this.prisma.supplier.findUnique({
        where: { id: supplierId },
        select: { id: true },
      }),
      this.prisma.productVariant.findUnique({
        where: { id: command.productVariantId },
        select: { id: true },
      }),
    ]);
    if (!supplier) throw new NotFoundException('Supplier not found');
    if (!variant) throw new NotFoundException('Product variant not found');

    const listing = await this.prisma.listing.create({
      data: {
        supplierId,
        productVariantId: command.productVariantId,
        condition: command.condition,
        price: command.price,
        currency: command.currency,
        status: ListingStatus.DRAFT,
        stockQuantity: 0,
      },
      select: LISTING_SELECT,
    });
    return mapListing(listing);
  }

  async update(
    supplierId: string,
    listingId: string,
    command: UpdateSupplierListing,
  ): Promise<SupplierListingDto> {
    const current = await this.prisma.listing.findFirst({
      where: { id: listingId, supplierId },
      select: { id: true, status: true },
    });
    if (!current) throw new NotFoundException('Listing not found');
    if (
      current.status !== ListingStatus.DRAFT &&
      current.status !== ListingStatus.REJECTED
    ) {
      throw new ConflictException(
        'Only draft or rejected listings can be edited',
      );
    }
    if (command.productVariantId) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: command.productVariantId },
        select: { id: true },
      });
      if (!variant) throw new NotFoundException('Product variant not found');
    }

    const result = await this.prisma.listing.updateMany({
      where: {
        id: listingId,
        supplierId,
        status: { in: [ListingStatus.DRAFT, ListingStatus.REJECTED] },
      },
      data: command,
    });
    if (result.count !== 1) {
      throw new ConflictException('Listing changed while it was being edited');
    }
    return this.get(supplierId, listingId);
  }
}

function listingOrderBy(
  query: SupplierListingsQuery,
): Prisma.ListingOrderByWithRelationInput[] {
  switch (query.sort) {
    case 'updated_asc':
      return [{ updatedAt: 'asc' }, { id: 'asc' }];
    case 'price_asc':
      return [{ price: 'asc' }, { id: 'asc' }];
    case 'price_desc':
      return [{ price: 'desc' }, { id: 'desc' }];
    default:
      return [{ updatedAt: 'desc' }, { id: 'desc' }];
  }
}

function cursorWhere(cursor: SupplierListingCursor): Prisma.ListingWhereInput {
  const operator = cursor.sort.endsWith('_asc') ? 'gt' : 'lt';
  if (cursor.sort.startsWith('updated_')) {
    const updatedAt = new Date(cursor.value);
    return {
      OR: [
        { updatedAt: { [operator]: updatedAt } },
        { updatedAt, id: { [operator]: cursor.id } },
      ],
    };
  }
  return {
    OR: [
      { price: { [operator]: cursor.value } },
      { price: cursor.value, id: { [operator]: cursor.id } },
    ],
  };
}

function cursorFromListing(
  listing: SelectedListing,
  query: SupplierListingsQuery,
): SupplierListingCursor {
  return {
    version: 1,
    sort: query.sort,
    value: query.sort.startsWith('updated_')
      ? listing.updatedAt.toISOString()
      : listing.price.toString(),
    id: listing.id,
  };
}

function mapListing(listing: SelectedListing): SupplierListingDto {
  return {
    id: listing.id,
    supplierId: listing.supplierId,
    status: listing.status,
    condition: listing.condition,
    price: listing.price.toString(),
    currency: listing.currency,
    stockQuantity: listing.stockQuantity,
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
    productVariant: listing.productVariant,
  };
}
