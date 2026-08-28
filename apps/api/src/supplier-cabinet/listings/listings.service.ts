import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  ActivityResourceType,
  ListingStatus,
  type UserRole,
} from '../../generated/prisma/enums';
import { ActivityLogService } from '../../internal-ops/activity-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  resolveListingModerationTransition,
  resolveSupplierListingTransition,
  resolveSupplierListingUpdate,
} from './listing-transition.policy';
import type {
  AdminListingAction,
  AdminModerationQuery,
  AdminModerationResponse,
  CreateSupplierListing,
  SupplierListingCursor,
  SupplierListingAction,
  SupplierListingDto,
  SupplierListingsQuery,
  SupplierListingsResponse,
  UpdateSupplierListing,
  UpdateSupplierStock,
} from './listings.types';
import {
  encodeAdminModerationCursor,
  encodeSupplierListingCursor,
} from './listings.validation';

const LISTING_SELECT = {
  id: true,
  supplierId: true,
  status: true,
  condition: true,
  price: true,
  currency: true,
  stockQuantity: true,
  inventoryVersion: true,
  rejectionReason: true,
  moderationReason: true,
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async listModeration(
    query: AdminModerationQuery,
  ): Promise<AdminModerationResponse> {
    const rows = await this.prisma.listing.findMany({
      where: {
        status: query.status,
        condition: query.condition ?? undefined,
        supplierId: query.supplierId ?? undefined,
        createdAt:
          query.createdFrom || query.createdTo
            ? {
                gte: query.createdFrom ?? undefined,
                lte: query.createdTo ?? undefined,
              }
            : undefined,
        AND: query.cursor
          ? [
              {
                OR: [
                  { updatedAt: { lt: query.cursor.updatedAt } },
                  {
                    updatedAt: query.cursor.updatedAt,
                    id: { lt: query.cursor.id },
                  },
                ],
              },
            ]
          : undefined,
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: query.pageSize + 1,
      select: {
        ...LISTING_SELECT,
        supplier: { select: { id: true, name: true } },
      },
    });
    const hasNextPage = rows.length > query.pageSize;
    const page = hasNextPage ? rows.slice(0, query.pageSize) : rows;
    const last = page.at(-1);
    return {
      data: page.map((listing) => ({
        ...mapListing(listing),
        supplier: listing.supplier,
      })),
      meta: {
        pageSize: query.pageSize,
        nextCursor:
          hasNextPage && last
            ? encodeAdminModerationCursor({
                id: last.id,
                updatedAt: last.updatedAt,
              })
            : null,
      },
    };
  }

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
    const nextStatus = resolveSupplierListingUpdate(current.status, command);
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
        status: current.status,
      },
      data: { ...command, status: nextStatus },
    });
    if (result.count !== 1) {
      throw new ConflictException('Listing changed while it was being edited');
    }
    return this.get(supplierId, listingId);
  }

  async transitionSupplierListing(
    supplierId: string,
    listingId: string,
    action: SupplierListingAction,
  ): Promise<SupplierListingDto> {
    const current = await this.prisma.listing.findFirst({
      where: { id: listingId, supplierId },
      select: { status: true, moderationReason: true },
    });
    if (!current) throw new NotFoundException('Listing not found');
    const nextStatus = resolveSupplierListingTransition(current.status, action, {
      moderationReason: current.moderationReason,
    });
    const result = await this.prisma.listing.updateMany({
      where: { id: listingId, supplierId, status: current.status },
      data: {
        status: nextStatus,
        rejectionReason: action === 'submit' ? null : undefined,
        moderationReason: action === 'submit' ? null : undefined,
      },
    });
    if (result.count !== 1) {
      throw new ConflictException(
        'Listing changed while it was being transitioned',
      );
    }
    return this.get(supplierId, listingId);
  }

  async transitionAdminListing(
    listingId: string,
    action: AdminListingAction,
    reason: string | undefined,
    actor: { id: string; role: UserRole },
  ): Promise<SupplierListingDto> {
    if ((action === 'reject' || action === 'pause') && !reason) {
      throw new BadRequestException('reason is required');
    }
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.listing.findUnique({
        where: { id: listingId },
        select: { status: true },
      });
      if (!current) throw new NotFoundException('Listing not found');
      const nextStatus = resolveListingModerationTransition(
        current.status,
        action,
        actor.role,
      );
      const result = await transaction.listing.updateMany({
        where: { id: listingId, status: current.status },
        data: {
          status: nextStatus,
          rejectionReason: action === 'reject' ? reason : null,
          moderationReason: action === 'pause' ? reason : null,
        },
      });
      if (result.count !== 1) {
        throw new ConflictException(
          'Listing changed while it was being reviewed',
        );
      }
      await this.activityLog.record(transaction, {
        actorUserId: actor.id,
        actorRole: actor.role,
        resourceType: ActivityResourceType.LISTING,
        resourceId: listingId,
        action: moderationActivity(action),
        previousStatus: current.status,
        newStatus: nextStatus,
        reason: reason ?? null,
      });
      const listing = await transaction.listing.findUnique({
        where: { id: listingId },
        select: LISTING_SELECT,
      });
      if (!listing) throw new NotFoundException('Listing not found');
      return mapListing(listing);
    });
  }

  async updateStock(
    supplierId: string,
    listingId: string,
    command: UpdateSupplierStock,
  ): Promise<SupplierListingDto> {
    const current = await this.prisma.listing.findFirst({
      where: { id: listingId, supplierId },
      select: { status: true },
    });
    if (!current) throw new NotFoundException('Listing not found');
    if (current.status === ListingStatus.ARCHIVED) {
      throw new ConflictException('An archived listing stock cannot be edited');
    }

    const updated = await this.prisma.listing.updateMany({
      where: {
        id: listingId,
        supplierId,
        status: { not: ListingStatus.ARCHIVED },
        inventoryVersion: command.expectedVersion,
      },
      data: {
        stockQuantity: command.quantity,
        inventoryVersion: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw new ConflictException(
        'Listing inventory changed; refetch before retrying',
      );
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
    inventoryVersion: listing.inventoryVersion,
    rejectionReason: listing.rejectionReason,
    moderationReason: listing.moderationReason,
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
    productVariant: listing.productVariant,
  };
}

function moderationActivity(action: AdminListingAction): string {
  switch (action) {
    case 'approve':
      return 'LISTING_APPROVED';
    case 'reject':
      return 'LISTING_REJECTED';
    case 'pause':
      return 'LISTING_EMERGENCY_PAUSED';
  }
}
