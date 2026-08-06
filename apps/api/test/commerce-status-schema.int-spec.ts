import 'dotenv/config';
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
});
