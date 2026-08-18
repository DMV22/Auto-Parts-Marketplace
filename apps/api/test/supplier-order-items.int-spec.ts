import 'dotenv/config';
import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { SupplierOrderItemsService } from '../src/supplier-cabinet/order-items/order-items.service';
import {
  encodeSupplierOrderItemCursor,
  SupplierOrderItemsQueryPipe,
} from '../src/supplier-cabinet/order-items/order-items.validation';
import {
  CANCELLED_ORDER_ITEM_ID,
  cleanSupplierOrderItemFixtures,
  createSupplierOrderItemFixtures,
  FOREIGN_ORDER_ITEM_ID,
  FOREIGN_ONLY_ORDER_ITEM_ID,
  MULTI_ORDER_CREATED_AT,
  MULTI_SUPPLIER_ORDER_ID,
  OWN_ORDER_ITEM_ID,
  OWN_SECOND_ORDER_ITEM_ID,
  PROCESSING_ORDER_ITEM_ID,
  SUPPLIER_ORDER_A_ID,
} from './supplier-order-items.fixtures';

const BASE_QUERY = new SupplierOrderItemsQueryPipe().transform({});

describe('SupplierOrderItemsService integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let service: SupplierOrderItemsService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [SupplierOrderItemsService],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    service = moduleRef.get(SupplierOrderItemsService);
  });

  beforeEach(async () => {
    await cleanSupplierOrderItemFixtures(prisma);
    await createSupplierOrderItemFixtures(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanSupplierOrderItemFixtures(prisma);
    await moduleRef?.close();
  });

  it('returns only owned lines from a multi-supplier Order using safe snapshots', async () => {
    const result = await service.list(SUPPLIER_ORDER_A_ID, BASE_QUERY);

    expect(result.data.map(({ id }) => id)).toEqual([
      OWN_SECOND_ORDER_ITEM_ID,
      OWN_ORDER_ITEM_ID,
      PROCESSING_ORDER_ITEM_ID,
      CANCELLED_ORDER_ITEM_ID,
    ]);
    expect(result.data).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: FOREIGN_ORDER_ITEM_ID }),
        expect.objectContaining({ id: FOREIGN_ONLY_ORDER_ITEM_ID }),
      ]),
    );
    expect(result.data[1]).toEqual({
      id: OWN_ORDER_ITEM_ID,
      orderId: MULTI_SUPPLIER_ORDER_ID,
      listingId: expect.any(String),
      productName: 'Historic Brake Pad',
      sku: 'HIST-BRAKE-1',
      manufacturerPartNumber: 'HIST-BRAKE-MPN',
      condition: 'NEW',
      quantity: 1,
      unitPrice: '125.00',
      lineTotal: '125.00',
      currency: 'UAH',
      orderStatus: 'PAID',
      orderedAt: '2026-08-12T10:00:00.000Z',
      orderUpdatedAt: '2026-08-12T10:00:00.000Z',
    });
  });

  it('applies status/date filters and deterministic cursor pagination', async () => {
    await expect(
      service.list(SUPPLIER_ORDER_A_ID, {
        ...BASE_QUERY,
        status: 'PAID',
        createdFrom: new Date('2026-08-12T00:00:00.000Z'),
        createdTo: new Date('2026-08-12T23:59:59.999Z'),
      }),
    ).resolves.toMatchObject({
      data: [{ id: OWN_SECOND_ORDER_ITEM_ID }, { id: OWN_ORDER_ITEM_ID }],
    });

    const first = await service.list(SUPPLIER_ORDER_A_ID, {
      ...BASE_QUERY,
      pageSize: 1,
    });
    expect(first).toMatchObject({
      data: [{ id: OWN_SECOND_ORDER_ITEM_ID }],
      meta: { pageSize: 1, hasNextPage: true, nextCursor: expect.any(String) },
    });
    const next = new SupplierOrderItemsQueryPipe().transform({
      pageSize: '1',
      cursor: first.meta.nextCursor!,
    });
    await expect(
      service.list(SUPPLIER_ORDER_A_ID, next),
    ).resolves.toMatchObject({
      data: [{ id: OWN_ORDER_ITEM_ID }],
    });
  });

  it('uses non-disclosing detail and cursor behavior for foreign records', async () => {
    await expect(
      service.detail(SUPPLIER_ORDER_A_ID, FOREIGN_ORDER_ITEM_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.detail(
        SUPPLIER_ORDER_A_ID,
        '94000000-0000-4000-8000-000000000099',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    const foreignCursor = {
      ...BASE_QUERY,
      cursor: new SupplierOrderItemsQueryPipe().transform({
        cursor: encodeSupplierOrderItemCursor({
          version: 1,
          orderCreatedAt: MULTI_ORDER_CREATED_AT,
          orderItemId: FOREIGN_ORDER_ITEM_ID,
        }),
      }).cursor,
    };
    await expect(
      service.list(SUPPLIER_ORDER_A_ID, foreignCursor),
    ).resolves.toEqual({
      data: [],
      meta: { pageSize: 20, nextCursor: null, hasNextPage: false },
    });
  });

  it('does not mutate commerce records while reading supplier projections', async () => {
    const before = await prisma.order.findUniqueOrThrow({
      where: { id: MULTI_SUPPLIER_ORDER_ID },
      select: {
        status: true,
        updatedAt: true,
        items: { select: { id: true } },
      },
    });
    await service.list(SUPPLIER_ORDER_A_ID, BASE_QUERY);
    await service.detail(SUPPLIER_ORDER_A_ID, OWN_ORDER_ITEM_ID);
    await expect(
      prisma.order.findUniqueOrThrow({
        where: { id: MULTI_SUPPLIER_ORDER_ID },
        select: {
          status: true,
          updatedAt: true,
          items: { select: { id: true } },
        },
      }),
    ).resolves.toEqual(before);
  });
});
