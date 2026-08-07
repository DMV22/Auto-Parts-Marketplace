import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

type DatabaseConstraint = {
  tableName: string;
  constraintType: 'f' | 'u';
  columns: string[];
};

describe('Commerce status persistence contract', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();

    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await moduleRef?.close();
  });

  it('persists the agreed status vocabularies in transition order', async () => {
    const values = await prisma.$queryRaw<
      Array<{ enumName: string; enumValue: string }>
    >`
      SELECT type.typname AS "enumName", value.enumlabel AS "enumValue"
      FROM pg_type AS type
      JOIN pg_enum AS value ON value.enumtypid = type.oid
      JOIN pg_namespace AS namespace ON namespace.oid = type.typnamespace
      WHERE namespace.nspname = current_schema()
        AND type.typname IN (
          'ListingCondition',
          'ListingStatus',
          'OrderStatus',
          'PaymentEventProcessingStatus',
          'ReturnRequestStatus'
        )
      ORDER BY type.typname, value.enumsortorder
    `;

    const enumValues = (enumName: string) =>
      values
        .filter((value) => value.enumName === enumName)
        .map((value) => value.enumValue);

    expect(enumValues('ListingStatus')).toEqual([
      'DRAFT',
      'PENDING_APPROVAL',
      'ACTIVE',
      'PAUSED',
      'REJECTED',
      'ARCHIVED',
    ]);
    expect(enumValues('ListingCondition')).toEqual([
      'NEW',
      'USED',
      'REMANUFACTURED',
    ]);
    expect(enumValues('OrderStatus')).toEqual([
      'PENDING_PAYMENT',
      'PAID',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
    ]);
    expect(enumValues('PaymentEventProcessingStatus')).toEqual([
      'RECEIVED',
      'PROCESSED',
      'FAILED',
    ]);
    expect(enumValues('ReturnRequestStatus')).toEqual([
      'REQUESTED',
      'APPROVED',
      'REJECTED',
      'RECEIVED',
      'COMPLETED',
      'CANCELLED',
    ]);
  });

  it('requires listing condition and indexes the public catalog filter path', async () => {
    const [column] = await prisma.$queryRaw<
      Array<{ isNullable: string; columnDefault: string | null }>
    >`
      SELECT
        is_nullable AS "isNullable",
        column_default AS "columnDefault"
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'Listing'
        AND column_name = 'condition'
    `;
    const indexes = await prisma.$queryRaw<Array<{ indexDefinition: string }>>`
      SELECT indexdef AS "indexDefinition"
      FROM pg_indexes
      WHERE schemaname = current_schema()
        AND tablename = 'Listing'
    `;

    expect(column).toEqual({ isNullable: 'NO', columnDefault: null });
    expect(
      indexes.map(({ indexDefinition }) => indexDefinition),
    ).toContainEqual(
      expect.stringContaining('(status, condition, currency, price)'),
    );
  });

  it('uses the agreed database defaults for new workflow records', async () => {
    const defaults = await prisma.$queryRaw<
      Array<{ tableName: string; columnDefault: string }>
    >`
      SELECT table_name AS "tableName", column_default AS "columnDefault"
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND column_name = 'status'
        AND table_name IN (
          'Listing',
          'Order',
          'PaymentEvent',
          'ReturnRequest'
        )
      ORDER BY table_name
    `;

    expect(defaults).toEqual([
      { tableName: 'Listing', columnDefault: '\'DRAFT\'::"ListingStatus"' },
      {
        tableName: 'Order',
        columnDefault: '\'PENDING_PAYMENT\'::"OrderStatus"',
      },
      {
        tableName: 'PaymentEvent',
        columnDefault: '\'RECEIVED\'::"PaymentEventProcessingStatus"',
      },
      {
        tableName: 'ReturnRequest',
        columnDefault: '\'REQUESTED\'::"ReturnRequestStatus"',
      },
    ]);
  });

  it('enforces payment idempotency and the return-to-item relation', async () => {
    const constraints = await prisma.$queryRaw<DatabaseConstraint[]>`
      WITH foreign_keys AS (
        SELECT
          table_definition.relname AS "tableName",
          'f'::TEXT AS "constraintType",
          array_agg(column_definition.attname ORDER BY key_column.ordinality)::TEXT[] AS columns
        FROM pg_constraint AS constraint_definition
        JOIN pg_class AS table_definition
          ON table_definition.oid = constraint_definition.conrelid
        JOIN pg_namespace AS namespace
          ON namespace.oid = table_definition.relnamespace
        CROSS JOIN LATERAL unnest(constraint_definition.conkey)
          WITH ORDINALITY AS key_column(attnum, ordinality)
        JOIN pg_attribute AS column_definition
          ON column_definition.attrelid = table_definition.oid
         AND column_definition.attnum = key_column.attnum
        WHERE namespace.nspname = current_schema()
          AND constraint_definition.contype = 'f'
        GROUP BY table_definition.relname, constraint_definition.oid
      ),
      unique_indexes AS (
        SELECT
          table_definition.relname AS "tableName",
          'u'::TEXT AS "constraintType",
          array_agg(column_definition.attname ORDER BY key_column.ordinality)::TEXT[] AS columns
        FROM pg_index AS index_definition
        JOIN pg_class AS table_definition
          ON table_definition.oid = index_definition.indrelid
        JOIN pg_namespace AS namespace
          ON namespace.oid = table_definition.relnamespace
        CROSS JOIN LATERAL unnest(index_definition.indkey::SMALLINT[])
          WITH ORDINALITY AS key_column(attnum, ordinality)
        JOIN pg_attribute AS column_definition
          ON column_definition.attrelid = table_definition.oid
         AND column_definition.attnum = key_column.attnum
        WHERE namespace.nspname = current_schema()
          AND index_definition.indisunique
          AND NOT index_definition.indisprimary
        GROUP BY table_definition.relname, index_definition.indexrelid
      )
      SELECT * FROM foreign_keys WHERE "tableName" = 'ReturnRequest'
      UNION ALL
      SELECT * FROM unique_indexes WHERE "tableName" = 'PaymentEvent'
    `;

    expect(constraints).toEqual(
      expect.arrayContaining([
        {
          tableName: 'PaymentEvent',
          constraintType: 'u',
          columns: ['externalEventId'],
        },
        {
          tableName: 'ReturnRequest',
          constraintType: 'f',
          columns: ['orderItemId'],
        },
      ]),
    );
  });

  it('enforces defaults, relations, foreign keys, and payment idempotency', async () => {
    const suffix = randomUUID();
    const createdIds: {
      brandId?: string;
      listingId?: string;
      orderId?: string;
      orderItemId?: string;
      paymentEventId?: string;
      productId?: string;
      productVariantId?: string;
      returnRequestId?: string;
      supplierId?: string;
      userId?: string;
    } = {};

    try {
      const user = await prisma.user.create({
        data: {
          name: 'Commerce persistence test customer',
          email: `commerce-${suffix}@example.test`,
        },
      });
      createdIds.userId = user.id;

      const supplier = await prisma.supplier.create({
        data: {
          name: 'Commerce persistence test supplier',
          slug: `commerce-${suffix}`,
        },
      });
      createdIds.supplierId = supplier.id;

      const brand = await prisma.brand.create({
        data: { name: `Commerce brand ${suffix}` },
      });
      createdIds.brandId = brand.id;

      const product = await prisma.product.create({
        data: {
          name: 'Commerce persistence test product',
          brandId: brand.id,
        },
      });
      createdIds.productId = product.id;

      const productVariant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: `COMMERCE-${suffix}`,
          manufacturerPartNumber: `MPN-${suffix}`,
        },
      });
      createdIds.productVariantId = productVariant.id;

      const listing = await prisma.listing.create({
        data: {
          supplierId: supplier.id,
          productVariantId: productVariant.id,
          condition: 'NEW',
          price: 100,
          currency: 'UAH',
        },
      });
      createdIds.listingId = listing.id;

      const order = await prisma.order.create({
        data: {
          customerId: user.id,
          currency: 'UAH',
          totalAmount: 100,
        },
      });
      createdIds.orderId = order.id;

      const orderItem = await prisma.orderItem.create({
        data: {
          orderId: order.id,
          listingId: listing.id,
          quantity: 1,
          unitPrice: 100,
        },
      });
      createdIds.orderItemId = orderItem.id;

      const paymentEvent = await prisma.paymentEvent.create({
        data: {
          orderId: order.id,
          externalEventId: `commerce-event-${suffix}`,
          provider: 'test',
          eventType: 'payment.received',
          payload: { synthetic: true },
        },
      });
      createdIds.paymentEventId = paymentEvent.id;

      const returnRequest = await prisma.returnRequest.create({
        data: {
          orderItemId: orderItem.id,
          reason: 'Synthetic integration-test return.',
        },
        include: { orderItem: true },
      });
      createdIds.returnRequestId = returnRequest.id;

      expect({
        listing: listing.status,
        order: order.status,
        paymentEvent: paymentEvent.status,
        returnRequest: returnRequest.status,
      }).toEqual({
        listing: 'DRAFT',
        order: 'PENDING_PAYMENT',
        paymentEvent: 'RECEIVED',
        returnRequest: 'REQUESTED',
      });
      expect(returnRequest.orderItem.id).toBe(orderItem.id);

      await expect(
        prisma.paymentEvent.create({
          data: {
            orderId: order.id,
            externalEventId: paymentEvent.externalEventId,
            provider: 'test',
            eventType: 'payment.received',
            payload: { synthetic: true },
          },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });

      await expect(
        prisma.returnRequest.create({
          data: {
            orderItemId: randomUUID(),
            reason: 'Synthetic invalid relation.',
          },
        }),
      ).rejects.toMatchObject({ code: 'P2003' });
    } finally {
      if (createdIds.returnRequestId) {
        await prisma.returnRequest.delete({
          where: { id: createdIds.returnRequestId },
        });
      }
      if (createdIds.paymentEventId) {
        await prisma.paymentEvent.delete({
          where: { id: createdIds.paymentEventId },
        });
      }
      if (createdIds.orderItemId) {
        await prisma.orderItem.delete({
          where: { id: createdIds.orderItemId },
        });
      }
      if (createdIds.orderId) {
        await prisma.order.delete({ where: { id: createdIds.orderId } });
      }
      if (createdIds.listingId) {
        await prisma.listing.delete({ where: { id: createdIds.listingId } });
      }
      if (createdIds.productVariantId) {
        await prisma.productVariant.delete({
          where: { id: createdIds.productVariantId },
        });
      }
      if (createdIds.productId) {
        await prisma.product.delete({ where: { id: createdIds.productId } });
      }
      if (createdIds.brandId) {
        await prisma.brand.delete({ where: { id: createdIds.brandId } });
      }
      if (createdIds.supplierId) {
        await prisma.supplier.delete({ where: { id: createdIds.supplierId } });
      }
      if (createdIds.userId) {
        await prisma.user.delete({ where: { id: createdIds.userId } });
      }
    }
  });

  it('keeps integration fixtures independent from the demo seed', async () => {
    const [users, suppliers, paymentEvents] = await Promise.all([
      prisma.user.count({
        where: { email: { endsWith: '@auto-parts.local' } },
      }),
      prisma.supplier.count({ where: { slug: { startsWith: 'demo-' } } }),
      prisma.paymentEvent.count({
        where: { externalEventId: { startsWith: 'demo-' } },
      }),
    ]);

    expect({ users, suppliers, paymentEvents }).toEqual({
      users: 0,
      suppliers: 0,
      paymentEvents: 0,
    });
  });
});
