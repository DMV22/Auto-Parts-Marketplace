import 'dotenv/config';
import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  CHECKOUT_GATEWAY,
  type CheckoutGateway,
} from '../src/commerce/checkout/checkout.gateway';
import { CheckoutService } from '../src/commerce/checkout/checkout.service';
import type { CommerceActor } from '../src/commerce/commerce.types';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  ACTIVE_LISTING_ID,
  CART_PRODUCT_ID,
  CART_SUPPLIER_ID,
} from './cart-api.fixtures';
import {
  CHECKOUT_GUEST_HASH,
  cleanCheckoutFixtures,
  createCheckoutFixtures,
  createGuestCheckoutCart,
  FakeCheckoutGateway,
} from './checkout-api.fixtures';

const GUEST_ACTOR: CommerceActor = {
  kind: 'GUEST',
  guestTokenHash: CHECKOUT_GUEST_HASH,
};
const REQUEST_ID = '83000000-0000-4000-8000-000000000001';

describe('CheckoutService integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let service: CheckoutService;
  let gateway: FakeCheckoutGateway;

  beforeAll(async () => {
    gateway = new FakeCheckoutGateway();
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        CheckoutService,
        {
          provide: CHECKOUT_GATEWAY,
          useValue: gateway satisfies CheckoutGateway,
        },
      ],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    service = moduleRef.get(CheckoutService);
  });

  beforeEach(async () => {
    gateway.calls.length = 0;
    gateway.sessions.clear();
    gateway.error = null;
    gateway.beforeCreate = undefined;
    await cleanCheckoutFixtures(prisma);
    await createCheckoutFixtures(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanCheckoutFixtures(prisma);
    await moduleRef?.close();
  });

  it('persists pending snapshots, timeline and stock reservation before Stripe', async () => {
    gateway.beforeCreate = async ({ orderId }) => {
      const order = await prisma.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { items: true, statusEvents: true },
      });
      expect(order).toMatchObject({
        status: 'PENDING_PAYMENT',
        currency: 'UAH',
        guestTokenHash: CHECKOUT_GUEST_HASH,
        checkoutRequestId: REQUEST_ID,
        items: [
          {
            listingId: ACTIVE_LISTING_ID,
            quantity: 2,
            productName: 'Cart Test Brake Pad',
            sku: 'CART-SKU-100',
            manufacturerPartNumber: 'CART-MPN-100',
            condition: 'NEW',
            supplierName: 'Cart Test Supplier',
          },
        ],
        statusEvents: [
          {
            fromStatus: null,
            toStatus: 'PENDING_PAYMENT',
            source: 'CHECKOUT',
          },
        ],
      });
      expect(order.totalAmount.toFixed(2)).toBe('250.00');
      expect(order.items[0].unitPrice.toFixed(2)).toBe('125.00');
      await expect(
        prisma.listing.findUniqueOrThrow({ where: { id: ACTIVE_LISTING_ID } }),
      ).resolves.toMatchObject({ stockQuantity: 3 });
    };

    await expect(
      service.createSession(GUEST_ACTOR, REQUEST_ID),
    ).resolves.toEqual({
      orderId: expect.any(String),
      status: 'PENDING_PAYMENT',
      currency: 'UAH',
      totalAmount: '250.00',
      checkoutExpiresAt: expect.any(String),
      checkoutSession: {
        id: expect.stringMatching(/^cs_test_/),
        url: expect.stringMatching(/^https:\/\/checkout\.stripe\.test\//),
      },
    });
  });

  it('reuses the same checkout and rejects a changed cart for one request ID', async () => {
    const first = await service.createSession(GUEST_ACTOR, REQUEST_ID);
    const repeated = await service.createSession(GUEST_ACTOR, REQUEST_ID);

    expect(repeated).toEqual(first);
    expect(gateway.calls).toHaveLength(1);
    await expect(prisma.order.count()).resolves.toBe(1);
    await expect(
      prisma.listing.findUniqueOrThrow({ where: { id: ACTIVE_LISTING_ID } }),
    ).resolves.toMatchObject({ stockQuantity: 3 });

    await prisma.cartItem.updateMany({
      where: { cart: { guestTokenHash: CHECKOUT_GUEST_HASH } },
      data: { quantity: 3 },
    });
    await expect(
      service.createSession(GUEST_ACTOR, REQUEST_ID),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(gateway.calls).toHaveLength(1);
  });

  it('converges concurrent retries of one request ID on one Order', async () => {
    const results = await Promise.all([
      service.createSession(GUEST_ACTOR, REQUEST_ID),
      service.createSession(GUEST_ACTOR, REQUEST_ID),
    ]);

    expect(results[0]).toEqual(results[1]);
    expect(new Set(results.map(({ orderId }) => orderId)).size).toBe(1);
    expect(gateway.sessions.size).toBe(1);
    await expect(prisma.order.count()).resolves.toBe(1);
    await expect(
      prisma.listing.findUniqueOrThrow({ where: { id: ACTIVE_LISTING_ID } }),
    ).resolves.toMatchObject({ stockQuantity: 3 });
  });

  it('cancels and releases stock exactly once after a gateway failure', async () => {
    gateway.error = new Error('Synthetic Stripe outage');

    await expect(
      service.createSession(GUEST_ACTOR, REQUEST_ID),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(
      prisma.listing.findUniqueOrThrow({ where: { id: ACTIVE_LISTING_ID } }),
    ).resolves.toMatchObject({ stockQuantity: 5 });

    const cancelled = await prisma.order.findUniqueOrThrow({
      where: { checkoutRequestId: REQUEST_ID },
      include: { statusEvents: { orderBy: { createdAt: 'asc' } } },
    });
    expect(cancelled).toMatchObject({
      status: 'CANCELLED',
      reservationReleasedAt: expect.any(Date),
      statusEvents: [
        { fromStatus: null, toStatus: 'PENDING_PAYMENT', source: 'CHECKOUT' },
        {
          fromStatus: 'PENDING_PAYMENT',
          toStatus: 'CANCELLED',
          source: 'SYSTEM',
        },
      ],
    });

    gateway.error = null;
    await expect(
      service.createSession(GUEST_ACTOR, REQUEST_ID),
    ).resolves.toMatchObject({
      orderId: cancelled.id,
      status: 'CANCELLED',
      checkoutSession: null,
    });
    expect(gateway.calls).toHaveLength(1);
    await expect(
      prisma.listing.findUniqueOrThrow({ where: { id: ACTIVE_LISTING_ID } }),
    ).resolves.toMatchObject({ stockQuantity: 5 });
  });

  it('uses the current server Listing price for Order and provider snapshots', async () => {
    await prisma.listing.update({
      where: { id: ACTIVE_LISTING_ID },
      data: { price: 130 },
    });

    const result = await service.createSession(GUEST_ACTOR, REQUEST_ID);

    expect(result.totalAmount).toBe('260.00');
    expect(gateway.calls[0].lineItems).toEqual([
      {
        name: 'Cart Test Brake Pad (CART-SKU-100)',
        currency: 'UAH',
        unitAmount: 13000,
        quantity: 2,
      },
    ]);
    const item = await prisma.orderItem.findFirstOrThrow();
    expect(item.unitPrice.toFixed(2)).toBe('130.00');
  });

  it.each([
    ['inactive Listing', { status: 'PAUSED' as const }],
    ['insufficient stock', { stockQuantity: 1 }],
    ['currency drift', { currency: 'USD' }],
  ])('rejects %s before creating an Order', async (_case, listingData) => {
    await prisma.listing.update({
      where: { id: ACTIVE_LISTING_ID },
      data: listingData,
    });

    await expect(
      service.createSession(GUEST_ACTOR, REQUEST_ID),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(prisma.order.count()).resolves.toBe(0);
    expect(gateway.calls).toHaveLength(0);
  });

  it('does not over-reserve stock under concurrent owner checkouts', async () => {
    const otherGuestHash =
      'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    await prisma.cartItem.updateMany({
      where: { cart: { guestTokenHash: CHECKOUT_GUEST_HASH } },
      data: { quantity: 3 },
    });
    await createGuestCheckoutCart(prisma, 3, otherGuestHash);

    const results = await Promise.allSettled([
      service.createSession(GUEST_ACTOR, REQUEST_ID),
      service.createSession(
        { kind: 'GUEST', guestTokenHash: otherGuestHash },
        '83000000-0000-4000-8000-000000000002',
      ),
    ]);

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(
      1,
    );
    await expect(
      prisma.listing.findUniqueOrThrow({ where: { id: ACTIVE_LISTING_ID } }),
    ).resolves.toMatchObject({ stockQuantity: 2 });
    await expect(prisma.order.count()).resolves.toBe(1);
  });

  it('keeps OrderItem display and price snapshots immutable', async () => {
    await service.createSession(GUEST_ACTOR, REQUEST_ID);
    await prisma.product.update({
      where: { id: CART_PRODUCT_ID },
      data: { name: 'Renamed Product' },
    });
    await prisma.supplier.update({
      where: { id: CART_SUPPLIER_ID },
      data: { name: 'Renamed Supplier' },
    });
    await prisma.listing.update({
      where: { id: ACTIVE_LISTING_ID },
      data: { price: 999, condition: 'USED' },
    });

    const item = await prisma.orderItem.findFirstOrThrow();
    expect(item).toMatchObject({
      productName: 'Cart Test Brake Pad',
      sku: 'CART-SKU-100',
      manufacturerPartNumber: 'CART-MPN-100',
      condition: 'NEW',
      supplierName: 'Cart Test Supplier',
    });
    expect(item.unitPrice.toFixed(2)).toBe('125.00');
  });
});
