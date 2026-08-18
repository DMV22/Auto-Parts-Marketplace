import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

const CUSTOMER_ID = 'a1000000-0000-4000-8000-000000000001';
const SUPPORT_ID = 'a1000000-0000-4000-8000-000000000002';
const BRAND_ID = 'a1000000-0000-4000-8000-000000000003';
const PRODUCT_ID = 'a1000000-0000-4000-8000-000000000004';
const VARIANT_ID = 'a1000000-0000-4000-8000-000000000005';
const SUPPLIER_ID = 'a1000000-0000-4000-8000-000000000006';
const LISTING_ID = 'a1000000-0000-4000-8000-000000000007';
const ORDER_ID = 'a1000000-0000-4000-8000-000000000008';
const ORDER_ITEM_ID = 'a1000000-0000-4000-8000-000000000009';

describe('Internal Ops persistence contract', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanFixtures(prisma);
    await createFixtures(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanFixtures(prisma);
    await moduleRef?.close();
  });

  it('persists the Internal Ops enum and column baseline', async () => {
    const enumRows = await prisma.$queryRaw<
      Array<{ enumName: string; enumValue: string }>
    >`
      SELECT type.typname AS "enumName", value.enumlabel AS "enumValue"
      FROM pg_type AS type
      JOIN pg_enum AS value ON value.enumtypid = type.oid
      JOIN pg_namespace AS namespace ON namespace.oid = type.typnamespace
      WHERE namespace.nspname = current_schema()
        AND type.typname IN (
          'ActivityResourceType',
          'OrderStatusEventSource',
          'ReturnRequestStatus'
        )
      ORDER BY type.typname, value.enumsortorder
    `;
    const values = (enumName: string) =>
      enumRows
        .filter((row) => row.enumName === enumName)
        .map((row) => row.enumValue);

    expect(values('ActivityResourceType')).toEqual([
      'ORDER',
      'RETURN_REQUEST',
      'LISTING',
      'NOTE',
    ]);
    expect(values('OrderStatusEventSource')).toContain('INTERNAL_OPS');
    expect(values('ReturnRequestStatus')).toContain('UNDER_REVIEW');

    const columns = await prisma.$queryRaw<
      Array<{ tableName: string; columnName: string }>
    >`
      SELECT table_name AS "tableName", column_name AS "columnName"
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND (
          (table_name = 'ReturnRequest' AND column_name IN (
            'createdByUserId', 'decidedByUserId', 'decisionReason', 'decidedAt'
          ))
          OR (table_name = 'Listing' AND column_name = 'moderationReason')
        )
      ORDER BY table_name, column_name
    `;
    expect(columns).toEqual([
      { tableName: 'Listing', columnName: 'moderationReason' },
      { tableName: 'ReturnRequest', columnName: 'createdByUserId' },
      { tableName: 'ReturnRequest', columnName: 'decidedAt' },
      { tableName: 'ReturnRequest', columnName: 'decidedByUserId' },
      { tableName: 'ReturnRequest', columnName: 'decisionReason' },
    ]);
  });

  it('commits the Note XOR check and unfinished-return partial unique index', async () => {
    const constraints = await prisma.$queryRaw<
      Array<{ name: string; definition: string }>
    >`
      SELECT
        constraint_definition.conname AS name,
        pg_get_constraintdef(constraint_definition.oid) AS definition
      FROM pg_constraint AS constraint_definition
      JOIN pg_class AS table_definition
        ON table_definition.oid = constraint_definition.conrelid
      JOIN pg_namespace AS namespace
        ON namespace.oid = table_definition.relnamespace
      WHERE namespace.nspname = current_schema()
        AND constraint_definition.conname = 'Note_exactly_one_target_check'
    `;
    const indexes = await prisma.$queryRaw<
      Array<{ name: string; definition: string }>
    >`
      SELECT indexname AS name, indexdef AS definition
      FROM pg_indexes
      WHERE schemaname = current_schema()
        AND indexname = 'ReturnRequest_one_unfinished_per_orderItem_idx'
    `;

    expect(constraints).toHaveLength(1);
    expect(constraints[0].definition).toContain('orderId');
    expect(constraints[0].definition).toContain('returnRequestId');
    expect(indexes).toHaveLength(1);
    expect(indexes[0].definition).toContain('CREATE UNIQUE INDEX');
    expect(indexes[0].definition).toContain('WHERE');
  });

  it('rejects Notes with zero or two targets while accepting each valid target', async () => {
    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderItemId: ORDER_ITEM_ID,
        createdByUserId: CUSTOMER_ID,
        reason: 'Synthetic Internal Ops return',
      },
    });

    await expect(
      prisma.note.create({
        data: { authorUserId: SUPPORT_ID, body: 'Missing target' },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.note.create({
        data: {
          orderId: ORDER_ID,
          returnRequestId: returnRequest.id,
          authorUserId: SUPPORT_ID,
          body: 'Two targets',
        },
      }),
    ).rejects.toThrow();

    await expect(
      prisma.note.create({
        data: {
          orderId: ORDER_ID,
          authorUserId: SUPPORT_ID,
          body: 'Order note',
        },
      }),
    ).resolves.toMatchObject({ orderId: ORDER_ID, returnRequestId: null });
    await expect(
      prisma.note.create({
        data: {
          returnRequestId: returnRequest.id,
          authorUserId: SUPPORT_ID,
          body: 'Return note',
        },
      }),
    ).resolves.toMatchObject({
      orderId: null,
      returnRequestId: returnRequest.id,
    });
  });

  it('allows only one unfinished ReturnRequest per OrderItem under concurrency', async () => {
    const results = await Promise.allSettled([
      prisma.returnRequest.create({
        data: {
          orderItemId: ORDER_ITEM_ID,
          createdByUserId: CUSTOMER_ID,
          reason: 'Concurrent return A',
        },
      }),
      prisma.returnRequest.create({
        data: {
          orderItemId: ORDER_ITEM_ID,
          createdByUserId: CUSTOMER_ID,
          reason: 'Concurrent return B',
        },
      }),
    ]);

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(
      1,
    );

    const unfinished = await prisma.returnRequest.findFirstOrThrow({
      where: { orderItemId: ORDER_ITEM_ID },
    });
    await prisma.returnRequest.update({
      where: { id: unfinished.id },
      data: { status: 'REJECTED' },
    });
    await expect(
      prisma.returnRequest.create({
        data: {
          orderItemId: ORDER_ITEM_ID,
          createdByUserId: SUPPORT_ID,
          status: 'UNDER_REVIEW',
          reason: 'New workflow after terminal request',
        },
      }),
    ).resolves.toMatchObject({ status: 'UNDER_REVIEW' });
  });

  it('persists actor snapshots and scoped ActivityLog fields', async () => {
    await expect(
      prisma.activityLog.create({
        data: {
          actorUserId: SUPPORT_ID,
          actorRole: 'SUPPORT_MANAGER',
          resourceType: 'ORDER',
          resourceId: ORDER_ID,
          action: 'ORDER_STATUS_CHANGED',
          previousStatus: 'PAID',
          newStatus: 'PROCESSING',
          reason: 'Synthetic integration-test action',
          metadata: { source: 'integration-test' },
        },
        include: { actor: true },
      }),
    ).resolves.toMatchObject({
      actor: { id: SUPPORT_ID },
      actorRole: 'SUPPORT_MANAGER',
      resourceType: 'ORDER',
      resourceId: ORDER_ID,
      action: 'ORDER_STATUS_CHANGED',
    });
  });
});

async function createFixtures(prisma: PrismaService): Promise<void> {
  await prisma.user.createMany({
    data: [
      {
        id: CUSTOMER_ID,
        name: 'Internal Ops Customer',
        email: 'internal-ops-customer@example.test',
      },
      {
        id: SUPPORT_ID,
        name: 'Internal Ops Support',
        email: 'internal-ops-support@example.test',
        role: 'SUPPORT_MANAGER',
      },
    ],
  });
  await prisma.brand.create({
    data: { id: BRAND_ID, name: 'Internal Ops Test Brand' },
  });
  await prisma.product.create({
    data: {
      id: PRODUCT_ID,
      name: 'Internal Ops Test Product',
      brandId: BRAND_ID,
      variants: {
        create: {
          id: VARIANT_ID,
          sku: 'INTERNAL-OPS-SKU',
          manufacturerPartNumber: 'INTERNAL-OPS-MPN',
        },
      },
    },
  });
  await prisma.supplier.create({
    data: {
      id: SUPPLIER_ID,
      name: 'Internal Ops Test Supplier',
      slug: 'internal-ops-test-supplier',
    },
  });
  await prisma.listing.create({
    data: {
      id: LISTING_ID,
      supplierId: SUPPLIER_ID,
      productVariantId: VARIANT_ID,
      condition: 'NEW',
      price: 100,
      currency: 'UAH',
    },
  });
  await prisma.order.create({
    data: {
      id: ORDER_ID,
      customerId: CUSTOMER_ID,
      status: 'DELIVERED',
      currency: 'UAH',
      totalAmount: 100,
      items: {
        create: {
          id: ORDER_ITEM_ID,
          listingId: LISTING_ID,
          quantity: 1,
          unitPrice: 100,
        },
      },
    },
  });
}

async function cleanFixtures(prisma: PrismaService): Promise<void> {
  await prisma.activityLog.deleteMany({
    where: { resourceId: ORDER_ID },
  });
  await prisma.note.deleteMany({
    where: {
      OR: [
        { orderId: ORDER_ID },
        { returnRequest: { orderItemId: ORDER_ITEM_ID } },
      ],
    },
  });
  await prisma.returnRequest.deleteMany({
    where: { orderItemId: ORDER_ITEM_ID },
  });
  await prisma.orderItem.deleteMany({ where: { id: ORDER_ITEM_ID } });
  await prisma.order.deleteMany({ where: { id: ORDER_ID } });
  await prisma.listing.deleteMany({ where: { id: LISTING_ID } });
  await prisma.supplier.deleteMany({ where: { id: SUPPLIER_ID } });
  await prisma.product.deleteMany({ where: { id: PRODUCT_ID } });
  await prisma.brand.deleteMany({ where: { id: BRAND_ID } });
  await prisma.user.deleteMany({
    where: { id: { in: [CUSTOMER_ID, SUPPORT_ID] } },
  });
}
