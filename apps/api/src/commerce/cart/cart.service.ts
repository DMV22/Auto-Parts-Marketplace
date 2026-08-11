import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { ListingStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import type { CommerceActor } from '../commerce.types';
import { GuestCartContextService } from '../guest-cart-context.service';
import type {
  AddCartItemInput,
  CartAvailabilityIssue,
  CartView,
  UpdateCartItemInput,
} from './cart.types';

const CART_SELECT = {
  id: true,
  currency: true,
  items: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      quantity: true,
      listing: {
        select: {
          id: true,
          status: true,
          condition: true,
          price: true,
          currency: true,
          stockQuantity: true,
          productVariant: {
            select: {
              id: true,
              sku: true,
              product: { select: { id: true, name: true } },
            },
          },
          supplier: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  },
} satisfies Prisma.CartSelect;

type CartProjection = Prisma.CartGetPayload<{ select: typeof CART_SELECT }>;

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guestContext: GuestCartContextService,
  ) {}

  async get(actor: CommerceActor): Promise<CartView> {
    const cart = await this.prisma.cart.findFirst({
      where: activeOwnerWhere(actor),
      select: CART_SELECT,
    });

    return cart ? toCartView(cart) : emptyCart();
  }

  async add(actor: CommerceActor, input: AddCartItemInput): Promise<CartView> {
    try {
      const cart = await this.prisma.$transaction(
        async (transaction) => {
          const listing = await transaction.listing.findUnique({
            where: { id: input.listingId },
            select: {
              id: true,
              status: true,
              currency: true,
              stockQuantity: true,
            },
          });
          assertPurchasableListing(listing, input.quantity);

          let existingCart = await transaction.cart.findUnique({
            where: ownerUniqueWhere(actor),
            select: { id: true, currency: true, expiresAt: true },
          });
          if (
            actor.kind === 'GUEST' &&
            existingCart?.expiresAt &&
            existingCart.expiresAt <= new Date()
          ) {
            await transaction.cart.delete({ where: { id: existingCart.id } });
            existingCart = null;
          }
          if (
            existingCart?.currency &&
            existingCart.currency !== listing.currency
          ) {
            throw new ConflictException('Cart currency conflict');
          }

          const expiresAt =
            actor.kind === 'GUEST' ? this.guestContext.expiresAt() : null;
          const cartRecord = existingCart
            ? await transaction.cart.update({
                where: { id: existingCart.id },
                data: { currency: listing.currency, expiresAt },
                select: { id: true },
              })
            : await transaction.cart.create({
                data: {
                  ...ownerCreateData(actor),
                  currency: listing.currency,
                  expiresAt,
                },
                select: { id: true },
              });

          const existingItem = await transaction.cartItem.findUnique({
            where: {
              cartId_listingId: {
                cartId: cartRecord.id,
                listingId: listing.id,
              },
            },
            select: { id: true, quantity: true },
          });
          const nextQuantity = (existingItem?.quantity ?? 0) + input.quantity;
          if (nextQuantity > listing.stockQuantity) {
            throw new ConflictException('Insufficient listing stock');
          }

          if (existingItem) {
            await transaction.cartItem.update({
              where: { id: existingItem.id },
              data: { quantity: nextQuantity },
            });
          } else {
            await transaction.cartItem.create({
              data: {
                cartId: cartRecord.id,
                listingId: listing.id,
                quantity: input.quantity,
              },
            });
          }

          return transaction.cart.findUniqueOrThrow({
            where: { id: cartRecord.id },
            select: CART_SELECT,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return toCartView(cart);
    } catch (error: unknown) {
      if (hasPrismaCode(error, 'P2002') || hasPrismaCode(error, 'P2034')) {
        throw new ConflictException('Cart changed concurrently');
      }
      throw error;
    }
  }

  async update(
    actor: CommerceActor,
    itemId: string,
    input: UpdateCartItemInput,
  ): Promise<CartView> {
    const cart = await this.prisma.$transaction(
      async (transaction) => {
        const item = await transaction.cartItem.findFirst({
          where: { id: itemId, cart: activeOwnerWhere(actor) },
          select: {
            id: true,
            cartId: true,
            listing: {
              select: {
                id: true,
                status: true,
                currency: true,
                stockQuantity: true,
              },
            },
          },
        });
        if (!item) {
          throw new NotFoundException('Cart item not found');
        }
        assertPurchasableListing(item.listing, input.quantity);

        await transaction.cartItem.update({
          where: { id: item.id },
          data: { quantity: input.quantity },
        });
        await transaction.cart.update({
          where: { id: item.cartId },
          data: {
            expiresAt:
              actor.kind === 'GUEST' ? this.guestContext.expiresAt() : null,
          },
        });

        return transaction.cart.findUniqueOrThrow({
          where: { id: item.cartId },
          select: CART_SELECT,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return toCartView(cart);
  }

  async remove(actor: CommerceActor, itemId: string): Promise<CartView> {
    const cart = await this.prisma.$transaction(
      async (transaction) => {
        const item = await transaction.cartItem.findFirst({
          where: { id: itemId, cart: activeOwnerWhere(actor) },
          select: { id: true, cartId: true },
        });
        if (!item) {
          throw new NotFoundException('Cart item not found');
        }

        await transaction.cartItem.delete({ where: { id: item.id } });
        const remainingItems = await transaction.cartItem.count({
          where: { cartId: item.cartId },
        });
        await transaction.cart.update({
          where: { id: item.cartId },
          data: {
            currency: remainingItems === 0 ? null : undefined,
            expiresAt:
              actor.kind === 'GUEST' ? this.guestContext.expiresAt() : null,
          },
        });

        return transaction.cart.findUniqueOrThrow({
          where: { id: item.cartId },
          select: CART_SELECT,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return toCartView(cart);
  }

  async clear(actor: CommerceActor): Promise<CartView> {
    const cart = await this.prisma.$transaction(
      async (transaction) => {
        const existingCart = await transaction.cart.findFirst({
          where: activeOwnerWhere(actor),
          select: { id: true },
        });
        if (!existingCart) {
          return null;
        }

        await transaction.cartItem.deleteMany({
          where: { cartId: existingCart.id },
        });
        await transaction.cart.update({
          where: { id: existingCart.id },
          data: {
            currency: null,
            expiresAt:
              actor.kind === 'GUEST' ? this.guestContext.expiresAt() : null,
          },
        });
        return transaction.cart.findUniqueOrThrow({
          where: { id: existingCart.id },
          select: CART_SELECT,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return cart ? toCartView(cart) : emptyCart();
  }
}

function activeOwnerWhere(actor: CommerceActor): Prisma.CartWhereInput {
  return actor.kind === 'CUSTOMER'
    ? { customerId: actor.customerId }
    : {
        guestTokenHash: actor.guestTokenHash,
        expiresAt: { gt: new Date() },
      };
}

function ownerUniqueWhere(actor: CommerceActor): Prisma.CartWhereUniqueInput {
  return actor.kind === 'CUSTOMER'
    ? { customerId: actor.customerId }
    : { guestTokenHash: actor.guestTokenHash };
}

function ownerCreateData(
  actor: CommerceActor,
): Pick<Prisma.CartUncheckedCreateInput, 'customerId' | 'guestTokenHash'> {
  return actor.kind === 'CUSTOMER'
    ? { customerId: actor.customerId, guestTokenHash: null }
    : { customerId: null, guestTokenHash: actor.guestTokenHash };
}

function assertPurchasableListing(
  listing: {
    status: ListingStatus;
    stockQuantity: number;
  } | null,
  quantity: number,
): asserts listing is {
  id: string;
  status: ListingStatus;
  currency: string;
  stockQuantity: number;
} {
  if (!listing || listing.status !== ListingStatus.ACTIVE) {
    throw new NotFoundException('Listing not found');
  }
  if (listing.stockQuantity < quantity) {
    throw new ConflictException('Insufficient listing stock');
  }
}

function emptyCart(): CartView {
  return {
    id: null,
    currency: null,
    totalQuantity: 0,
    totalAmount: '0.00',
    items: [],
  };
}

function toCartView(cart: CartProjection): CartView {
  let totalMinor = 0n;
  let totalQuantity = 0;

  const items = cart.items.map((item) => {
    const unitMinor = toMinorUnits(item.listing.price.toString());
    const lineMinor = unitMinor * BigInt(item.quantity);
    const issues: CartAvailabilityIssue[] = [];
    if (item.listing.status !== ListingStatus.ACTIVE) {
      issues.push('LISTING_UNAVAILABLE');
    }
    if (item.listing.stockQuantity < item.quantity) {
      issues.push('INSUFFICIENT_STOCK');
    }
    if (cart.currency !== item.listing.currency) {
      issues.push('CURRENCY_MISMATCH');
    }

    totalMinor += lineMinor;
    totalQuantity += item.quantity;

    return {
      id: item.id,
      quantity: item.quantity,
      unitPrice: formatMinorUnits(unitMinor),
      lineTotal: formatMinorUnits(lineMinor),
      available: issues.length === 0,
      issues,
      listing: {
        id: item.listing.id,
        condition: item.listing.condition,
        currency: item.listing.currency,
        inStock: item.listing.stockQuantity > 0,
        productVariant: item.listing.productVariant,
        supplier: item.listing.supplier,
      },
    };
  });

  return {
    id: cart.id,
    currency: cart.currency,
    totalQuantity,
    totalAmount: formatMinorUnits(totalMinor),
    items,
  };
}

function toMinorUnits(value: string): bigint {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
}

function formatMinorUnits(value: bigint): string {
  const whole = value / 100n;
  const fraction = (value % 100n).toString().padStart(2, '0');
  return `${whole}.${fraction}`;
}

function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
