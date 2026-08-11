/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { createHash } from 'node:crypto';
import {
  ConflictException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  ListingStatus,
  OrderStatus,
  OrderStatusEventSource,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import type { CommerceActor } from '../commerce.types';
import {
  CHECKOUT_GATEWAY,
  type CheckoutGateway,
  type CheckoutGatewaySession,
  type CreateCheckoutSessionCommand,
} from './checkout.gateway';
import type { CheckoutSessionView } from './checkout.types';

// Stripe requires expires_at to be at least 30 minutes from the provider call.
// The extra minute covers the database transaction and network hand-off.
const CHECKOUT_TTL_MS = 31 * 60 * 1000;
const CHECKOUT_CART_SELECT = {
  id: true,
  currency: true,
  items: {
    orderBy: [{ listingId: 'asc' }, { id: 'asc' }],
    select: {
      quantity: true,
      listing: {
        select: {
          id: true,
          status: true,
          condition: true,
          price: true,
          currency: true,
          stockQuantity: true,
          supplier: { select: { name: true } },
          productVariant: {
            select: {
              sku: true,
              manufacturerPartNumber: true,
              product: { select: { name: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CartSelect;

type CheckoutCart = Prisma.CartGetPayload<{
  select: typeof CHECKOUT_CART_SELECT;
}>;

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CHECKOUT_GATEWAY) private readonly gateway: CheckoutGateway,
  ) {}

  async createSession(
    actor: CommerceActor,
    idempotencyKey: string,
  ): Promise<CheckoutSessionView> {
    const pending = await this.preparePendingOrder(actor, idempotencyKey);

    if (!pending.gatewayCommand) {
      return toCheckoutView(pending.order);
    }

    let session: CheckoutGatewaySession;
    try {
      session = await this.gateway.createSession(pending.gatewayCommand);
    } catch (error: unknown) {
      await this.compensateGatewayFailure(pending.order.id);
      throw new ServiceUnavailableException('Checkout provider unavailable', {
        cause: error,
      });
    }

    try {
      const order = await this.prisma.order.update({
        where: { id: pending.order.id },
        data: {
          checkoutSessionId: session.id,
          checkoutSessionUrl: session.url,
        },
        select: ORDER_VIEW_SELECT,
      });
      return toCheckoutView(order);
    } catch (error: unknown) {
      throw new ServiceUnavailableException(
        'Checkout persistence unavailable',
        {
          cause: error,
        },
      );
    }
  }

  private async preparePendingOrder(
    actor: CommerceActor,
    idempotencyKey: string,
  ) {
    try {
      return await this.createPendingOrder(actor, idempotencyKey);
    } catch (error: unknown) {
      if (!hasPrismaCode(error, 'P2002') && !hasPrismaCode(error, 'P2034')) {
        throw error;
      }
    }

    try {
      return await this.createPendingOrder(actor, idempotencyKey);
    } catch (error: unknown) {
      if (hasPrismaCode(error, 'P2002') || hasPrismaCode(error, 'P2034')) {
        throw new ConflictException('Checkout changed concurrently');
      }
      throw error;
    }
  }

  private async createPendingOrder(
    actor: CommerceActor,
    idempotencyKey: string,
  ) {
    return this.prisma.$transaction(
      async (transaction) => {
        const cart = await transaction.cart.findFirst({
          where: activeCartOwnerWhere(actor),
          select: CHECKOUT_CART_SELECT,
        });
        assertCheckoutCart(cart);

        const fingerprint = checkoutFingerprint(cart);
        const existing = await transaction.order.findUnique({
          where: { checkoutRequestId: idempotencyKey },
          select: ORDER_VIEW_SELECT,
        });
        if (existing) {
          if (
            !orderBelongsTo(existing, actor) ||
            existing.checkoutRequestFingerprint !== fingerprint
          ) {
            throw new ConflictException('Checkout idempotency conflict');
          }

          return {
            order: existing,
            gatewayCommand:
              existing.status === OrderStatus.PENDING_PAYMENT &&
              !existing.checkoutSessionId
                ? toGatewayCommand(existing, cart, idempotencyKey)
                : null,
          };
        }

        const expiresAt = new Date(Date.now() + CHECKOUT_TTL_MS);
        let totalMinor = 0n;
        for (const item of cart.items) {
          assertCheckoutListing(item.listing, item.quantity, cart.currency!);
          const reserved = await transaction.listing.updateMany({
            where: {
              id: item.listing.id,
              status: ListingStatus.ACTIVE,
              currency: cart.currency!,
              price: item.listing.price,
              stockQuantity: { gte: item.quantity },
            },
            data: { stockQuantity: { decrement: item.quantity } },
          });
          if (reserved.count !== 1) {
            throw new ConflictException('Checkout stock changed');
          }
          totalMinor +=
            toMinorUnits(item.listing.price.toString()) * BigInt(item.quantity);
        }

        const order = await transaction.order.create({
          data: {
            ...orderOwnerData(actor),
            currency: cart.currency!,
            totalAmount: formatMinorUnits(totalMinor),
            checkoutRequestId: idempotencyKey,
            checkoutRequestFingerprint: fingerprint,
            checkoutExpiresAt: expiresAt,
            items: {
              create: cart.items.map(({ listing, quantity }) => ({
                listingId: listing.id,
                quantity,
                unitPrice: listing.price,
                productName: listing.productVariant.product.name,
                sku: listing.productVariant.sku,
                manufacturerPartNumber:
                  listing.productVariant.manufacturerPartNumber,
                condition: listing.condition,
                supplierName: listing.supplier.name,
              })),
            },
            statusEvents: {
              create: {
                fromStatus: null,
                toStatus: OrderStatus.PENDING_PAYMENT,
                source: OrderStatusEventSource.CHECKOUT,
              },
            },
          },
          select: ORDER_VIEW_SELECT,
        });

        return {
          order,
          gatewayCommand: toGatewayCommand(order, cart, idempotencyKey),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async compensateGatewayFailure(orderId: string): Promise<void> {
    await this.prisma.$transaction(
      async (transaction) => {
        const released = await transaction.order.updateMany({
          where: {
            id: orderId,
            status: OrderStatus.PENDING_PAYMENT,
            reservationReleasedAt: null,
            checkoutSessionId: null,
          },
          data: {
            status: OrderStatus.CANCELLED,
            reservationReleasedAt: new Date(),
          },
        });
        if (released.count === 0) return;

        const items = await transaction.orderItem.findMany({
          where: { orderId },
          select: { listingId: true, quantity: true },
        });
        for (const item of items) {
          await transaction.listing.update({
            where: { id: item.listingId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }
        await transaction.orderStatusEvent.create({
          data: {
            orderId,
            fromStatus: OrderStatus.PENDING_PAYMENT,
            toStatus: OrderStatus.CANCELLED,
            source: OrderStatusEventSource.SYSTEM,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

const ORDER_VIEW_SELECT = {
  id: true,
  customerId: true,
  guestTokenHash: true,
  status: true,
  currency: true,
  totalAmount: true,
  checkoutRequestId: true,
  checkoutRequestFingerprint: true,
  checkoutExpiresAt: true,
  checkoutSessionId: true,
  checkoutSessionUrl: true,
} satisfies Prisma.OrderSelect;

type OrderViewProjection = Prisma.OrderGetPayload<{
  select: typeof ORDER_VIEW_SELECT;
}>;

function activeCartOwnerWhere(actor: CommerceActor): Prisma.CartWhereInput {
  return actor.kind === 'CUSTOMER'
    ? { customerId: actor.customerId }
    : {
        guestTokenHash: actor.guestTokenHash,
        expiresAt: { gt: new Date() },
      };
}

function orderOwnerData(
  actor: CommerceActor,
): Pick<Prisma.OrderUncheckedCreateInput, 'customerId' | 'guestTokenHash'> {
  return actor.kind === 'CUSTOMER'
    ? { customerId: actor.customerId, guestTokenHash: null }
    : { customerId: null, guestTokenHash: actor.guestTokenHash };
}

function orderBelongsTo(
  order: Pick<OrderViewProjection, 'customerId' | 'guestTokenHash'>,
  actor: CommerceActor,
): boolean {
  return actor.kind === 'CUSTOMER'
    ? order.customerId === actor.customerId
    : order.guestTokenHash === actor.guestTokenHash;
}

function assertCheckoutCart(
  cart: CheckoutCart | null,
): asserts cart is CheckoutCart {
  if (!cart?.currency || cart.items.length === 0) {
    throw new ConflictException('Cart is not ready for checkout');
  }
}

function assertCheckoutListing(
  listing: CheckoutCart['items'][number]['listing'],
  quantity: number,
  currency: string,
): void {
  if (
    listing.status !== ListingStatus.ACTIVE ||
    listing.currency !== currency ||
    listing.stockQuantity < quantity
  ) {
    throw new ConflictException('Cart contains stale listing data');
  }
}

function checkoutFingerprint(cart: CheckoutCart): string {
  const payload = {
    currency: cart.currency,
    items: cart.items.map(({ listing, quantity }) => ({
      listingId: listing.id,
      quantity,
      price: listing.price.toFixed(2),
    })),
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function toGatewayCommand(
  order: OrderViewProjection,
  cart: CheckoutCart,
  idempotencyKey: string,
): CreateCheckoutSessionCommand {
  return {
    orderId: order.id,
    idempotencyKey,
    expiresAt: order.checkoutExpiresAt!,
    lineItems: cart.items.map(({ listing, quantity }) => ({
      name: `${listing.productVariant.product.name} (${listing.productVariant.sku})`,
      currency: listing.currency,
      unitAmount: Number(toMinorUnits(listing.price.toString())),
      quantity,
    })),
  };
}

function toCheckoutView(order: OrderViewProjection): CheckoutSessionView {
  return {
    orderId: order.id,
    status: order.status,
    currency: order.currency,
    totalAmount: order.totalAmount.toFixed(2),
    checkoutExpiresAt: order.checkoutExpiresAt!.toISOString(),
    checkoutSession:
      order.checkoutSessionId && order.checkoutSessionUrl
        ? { id: order.checkoutSessionId, url: order.checkoutSessionUrl }
        : null,
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
