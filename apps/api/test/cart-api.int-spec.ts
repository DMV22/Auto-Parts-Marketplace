import 'dotenv/config';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from '../src/commerce/cart/cart.service';
import type { CommerceActor } from '../src/commerce/commerce.types';
import { GuestCartContextService } from '../src/commerce/guest-cart-context.service';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  ACTIVE_LISTING_ID,
  cleanCartFixtures,
  createCartFixtures,
  EMPTY_LISTING_ID,
  OTHER_CURRENCY_LISTING_ID,
  PAUSED_LISTING_ID,
} from './cart-api.fixtures';

const GUEST_ACTOR: CommerceActor = {
  kind: 'GUEST',
  guestTokenHash:
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
};
const OTHER_GUEST_ACTOR: CommerceActor = {
  kind: 'GUEST',
  guestTokenHash:
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
};

describe('CartService integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let service: CartService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [CartService, GuestCartContextService],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    service = moduleRef.get(CartService);
  });

  beforeEach(async () => {
    await cleanCartFixtures(prisma);
    await createCartFixtures(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanCartFixtures(prisma);
    await moduleRef?.close();
  });

  it('creates and reads a Guest cart from current Listing data', async () => {
    const created = await service.add(GUEST_ACTOR, {
      listingId: ACTIVE_LISTING_ID,
      quantity: 2,
    });

    expect(created).toEqual({
      id: expect.any(String),
      currency: 'UAH',
      totalQuantity: 2,
      totalAmount: '250.00',
      items: [
        expect.objectContaining({
          id: expect.any(String),
          quantity: 2,
          unitPrice: '125.00',
          lineTotal: '250.00',
          available: true,
          issues: [],
          listing: expect.objectContaining({
            id: ACTIVE_LISTING_ID,
            inStock: true,
          }),
        }),
      ],
    });
    await expect(service.get(GUEST_ACTOR)).resolves.toEqual(created);
  });

  it('updates quantity only for an item owned by the same Guest', async () => {
    const created = await service.add(GUEST_ACTOR, {
      listingId: ACTIVE_LISTING_ID,
      quantity: 1,
    });
    const itemId = created.items[0].id;

    await expect(
      service.update(GUEST_ACTOR, itemId, { quantity: 3 }),
    ).resolves.toMatchObject({
      totalQuantity: 3,
      totalAmount: '375.00',
      items: [{ id: itemId, quantity: 3, available: true }],
    });
    await expect(
      service.update(OTHER_GUEST_ACTOR, itemId, { quantity: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('clears currency after removing the last owned item', async () => {
    const created = await service.add(GUEST_ACTOR, {
      listingId: ACTIVE_LISTING_ID,
      quantity: 1,
    });
    const itemId = created.items[0].id;

    await expect(
      service.remove(OTHER_GUEST_ACTOR, itemId),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(GUEST_ACTOR, itemId)).resolves.toMatchObject({
      id: created.id,
      currency: null,
      totalQuantity: 0,
      totalAmount: '0.00',
      items: [],
    });
    await expect(
      service.add(GUEST_ACTOR, {
        listingId: OTHER_CURRENCY_LISTING_ID,
        quantity: 1,
      }),
    ).resolves.toMatchObject({ currency: 'USD', totalAmount: '10.00' });
  });

  it('idempotently clears only the owned Cart', async () => {
    const created = await service.add(GUEST_ACTOR, {
      listingId: ACTIVE_LISTING_ID,
      quantity: 2,
    });

    await expect(service.clear(OTHER_GUEST_ACTOR)).resolves.toEqual({
      id: null,
      currency: null,
      totalQuantity: 0,
      totalAmount: '0.00',
      items: [],
    });
    await expect(service.clear(GUEST_ACTOR)).resolves.toMatchObject({
      id: created.id,
      currency: null,
      items: [],
    });
    await expect(service.clear(GUEST_ACTOR)).resolves.toMatchObject({
      id: created.id,
      currency: null,
      items: [],
    });
  });

  it('increments a duplicate Listing and rejects invalid commercial state', async () => {
    await service.add(GUEST_ACTOR, {
      listingId: ACTIVE_LISTING_ID,
      quantity: 1,
    });
    await expect(
      service.add(GUEST_ACTOR, {
        listingId: ACTIVE_LISTING_ID,
        quantity: 2,
      }),
    ).resolves.toMatchObject({ totalQuantity: 3, totalAmount: '375.00' });
    await expect(
      service.add(GUEST_ACTOR, {
        listingId: ACTIVE_LISTING_ID,
        quantity: 3,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.add(GUEST_ACTOR, {
        listingId: OTHER_CURRENCY_LISTING_ID,
        quantity: 1,
      }),
    ).rejects.toThrow('Cart currency conflict');
    await expect(
      service.add(GUEST_ACTOR, {
        listingId: PAUSED_LISTING_ID,
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.add(GUEST_ACTOR, {
        listingId: EMPTY_LISTING_ID,
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('reads current price and availability instead of a stale Cart snapshot', async () => {
    await service.add(GUEST_ACTOR, {
      listingId: ACTIVE_LISTING_ID,
      quantity: 2,
    });
    await prisma.listing.update({
      where: { id: ACTIVE_LISTING_ID },
      data: { price: 130, stockQuantity: 1 },
    });

    await expect(service.get(GUEST_ACTOR)).resolves.toMatchObject({
      totalAmount: '260.00',
      items: [
        {
          unitPrice: '130.00',
          lineTotal: '260.00',
          available: false,
          issues: ['INSUFFICIENT_STOCK'],
        },
      ],
    });
  });

  it('does not exceed stock under concurrent Cart writes', async () => {
    const results = await Promise.allSettled([
      service.add(GUEST_ACTOR, {
        listingId: ACTIVE_LISTING_ID,
        quantity: 3,
      }),
      service.add(GUEST_ACTOR, {
        listingId: ACTIVE_LISTING_ID,
        quantity: 3,
      }),
    ]);

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    const rejected = results.find(({ status }) => status === 'rejected');
    expect(rejected).toMatchObject({
      status: 'rejected',
      reason: expect.any(ConflictException),
    });
    await expect(service.get(GUEST_ACTOR)).resolves.toMatchObject({
      totalQuantity: 3,
    });
  });

  it('isolates a Customer Cart from other Customers and Guests', async () => {
    const [owner, otherCustomer] = await Promise.all([
      prisma.user.create({
        data: { name: 'Cart Owner', email: 'owner@cart.test' },
      }),
      prisma.user.create({
        data: { name: 'Other Cart Owner', email: 'other@cart.test' },
      }),
    ]);
    const ownerActor: CommerceActor = {
      kind: 'CUSTOMER',
      customerId: owner.id,
    };
    const otherActor: CommerceActor = {
      kind: 'CUSTOMER',
      customerId: otherCustomer.id,
    };
    const created = await service.add(ownerActor, {
      listingId: ACTIVE_LISTING_ID,
      quantity: 1,
    });

    await expect(service.get(ownerActor)).resolves.toEqual(created);
    await expect(service.get(otherActor)).resolves.toMatchObject({ id: null });
    await expect(service.get(GUEST_ACTOR)).resolves.toMatchObject({ id: null });
    await expect(
      service.update(otherActor, created.items[0].id, { quantity: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not restore items from an expired Guest Cart', async () => {
    const created = await service.add(GUEST_ACTOR, {
      listingId: ACTIVE_LISTING_ID,
      quantity: 2,
    });
    await prisma.cart.update({
      where: { id: created.id! },
      data: { expiresAt: new Date('2000-01-01T00:00:00.000Z') },
    });

    await expect(service.get(GUEST_ACTOR)).resolves.toMatchObject({ id: null });
    const replacement = await service.add(GUEST_ACTOR, {
      listingId: ACTIVE_LISTING_ID,
      quantity: 1,
    });
    expect(replacement.id).not.toBe(created.id);
    expect(replacement.totalQuantity).toBe(1);
  });

  it('enforces owner XOR and positive quantity in PostgreSQL', async () => {
    const customer = await prisma.user.create({
      data: { name: 'Constraint Owner', email: 'constraint@cart.test' },
    });
    await expect(
      prisma.cart.create({
        data: {
          customerId: customer.id,
          guestTokenHash:
            'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
          expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        },
      }),
    ).rejects.toBeDefined();

    const cart = await prisma.cart.create({
      data: { customerId: customer.id },
    });
    await expect(
      prisma.cartItem.create({
        data: {
          cartId: cart.id,
          listingId: ACTIVE_LISTING_ID,
          quantity: 0,
        },
      }),
    ).rejects.toBeDefined();
  });
});
