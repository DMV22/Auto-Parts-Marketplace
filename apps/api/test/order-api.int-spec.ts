import 'dotenv/config';
import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { CommerceActor } from '../src/commerce/commerce.types';
import { OrdersService } from '../src/commerce/orders/orders.service';
import {
  encodeOrderCursor,
  OrdersPaginationQueryPipe,
} from '../src/commerce/orders/orders.validation';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  cleanOrderReadFixtures,
  createOrderReadFixtures,
  CUSTOMER_EXPIRED_ORDER_ID,
  CUSTOMER_PAID_ORDER_ID,
  CUSTOMER_PENDING_ORDER_ID,
  GUEST_ORDER_ID,
  ORDER_CUSTOMER_ID,
  ORDER_GUEST_HASH,
  OTHER_ORDER_ID,
} from './order-api.fixtures';

const CUSTOMER_ACTOR: CommerceActor = {
  kind: 'CUSTOMER',
  customerId: ORDER_CUSTOMER_ID,
};
const GUEST_ACTOR: CommerceActor = {
  kind: 'GUEST',
  guestTokenHash: ORDER_GUEST_HASH,
};

describe('OrdersService integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let service: OrdersService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [OrdersService],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    service = moduleRef.get(OrdersService);
  });

  beforeEach(async () => {
    await cleanOrderReadFixtures(prisma);
    await createOrderReadFixtures(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanOrderReadFixtures(prisma);
    await moduleRef?.close();
  });

  it('returns deterministic owner-only history through an opaque cursor', async () => {
    const first = await service.list(CUSTOMER_ACTOR, {
      limit: 2,
      cursor: null,
    });
    expect(first).toEqual({
      data: [
        expect.objectContaining({
          orderId: CUSTOMER_PAID_ORDER_ID,
          status: 'PAID',
          totalAmount: '250.00',
          itemCount: 1,
        }),
        expect.objectContaining({
          orderId: CUSTOMER_PENDING_ORDER_ID,
          status: 'PENDING_PAYMENT',
        }),
      ],
      pageInfo: {
        nextCursor: expect.any(String),
        hasNextPage: true,
      },
    });

    const query = new OrdersPaginationQueryPipe().transform({
      limit: '2',
      cursor: first.pageInfo.nextCursor!,
    });
    await expect(service.list(CUSTOMER_ACTOR, query)).resolves.toEqual({
      data: [expect.objectContaining({ orderId: CUSTOMER_EXPIRED_ORDER_ID })],
      pageInfo: { nextCursor: null, hasNextPage: false },
    });
  });

  it('returns immutable item snapshots without internal commerce fields', async () => {
    await expect(
      service.detail(CUSTOMER_ACTOR, CUSTOMER_PAID_ORDER_ID),
    ).resolves.toEqual({
      orderId: CUSTOMER_PAID_ORDER_ID,
      status: 'PAID',
      currency: 'UAH',
      totalAmount: '250.00',
      createdAt: '2026-08-11T10:00:00.000Z',
      updatedAt: expect.any(String),
      items: [
        {
          id: expect.any(String),
          listingId: expect.any(String),
          productName: 'Historic Brake Pad',
          sku: 'HIST-SKU-100',
          manufacturerPartNumber: 'HIST-MPN-100',
          condition: 'NEW',
          supplierName: 'Historic Supplier',
          unitPrice: '125.00',
          quantity: 2,
          lineTotal: '250.00',
        },
      ],
    });
  });

  it('maps paid and expired transitions to public timeline reason codes', async () => {
    const first = await service.timeline(
      CUSTOMER_ACTOR,
      CUSTOMER_PAID_ORDER_ID,
      { limit: 1, cursor: null },
    );
    expect(first).toEqual({
      data: [
        {
          id: expect.any(String),
          previousStatus: 'PENDING_PAYMENT',
          status: 'PAID',
          reasonCode: 'PAYMENT_CONFIRMED',
          occurredAt: '2026-08-11T10:05:00.000Z',
        },
      ],
      pageInfo: { nextCursor: expect.any(String), hasNextPage: true },
    });
    const nextQuery = new OrdersPaginationQueryPipe().transform({
      limit: '1',
      cursor: first.pageInfo.nextCursor!,
    });
    await expect(
      service.timeline(CUSTOMER_ACTOR, CUSTOMER_PAID_ORDER_ID, nextQuery),
    ).resolves.toEqual({
      data: [
        {
          id: expect.any(String),
          previousStatus: null,
          status: 'PENDING_PAYMENT',
          reasonCode: 'ORDER_CREATED',
          occurredAt: '2026-08-11T10:00:00.000Z',
        },
      ],
      pageInfo: { nextCursor: null, hasNextPage: false },
    });
    await expect(
      service.timeline(CUSTOMER_ACTOR, CUSTOMER_EXPIRED_ORDER_ID, {
        limit: 20,
        cursor: null,
      }),
    ).resolves.toMatchObject({
      data: [
        {
          previousStatus: 'PENDING_PAYMENT',
          status: 'CANCELLED',
          reasonCode: 'CHECKOUT_EXPIRED',
        },
        { reasonCode: 'ORDER_CREATED' },
      ],
    });
  });

  it('gives Guest access only to the matching guest hash and hides other Orders', async () => {
    await expect(
      service.list(GUEST_ACTOR, { limit: 20, cursor: null }),
    ).resolves.toMatchObject({
      data: [{ orderId: GUEST_ORDER_ID }],
    });
    await expect(
      service.detail(CUSTOMER_ACTOR, OTHER_ORDER_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.detail(GUEST_ACTOR, CUSTOMER_PAID_ORDER_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.timeline(CUSTOMER_ACTOR, OTHER_ORDER_ID, {
        limit: 20,
        cursor: null,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    const foreignCursor = new OrdersPaginationQueryPipe().transform({
      limit: '20',
      cursor: encodeOrderCursor({
        id: OTHER_ORDER_ID,
        createdAt: '2026-08-12T10:00:00.000Z',
      }),
    });
    await expect(service.list(CUSTOMER_ACTOR, foreignCursor)).resolves.toEqual({
      data: [],
      pageInfo: { nextCursor: null, hasNextPage: false },
    });
  });
});
