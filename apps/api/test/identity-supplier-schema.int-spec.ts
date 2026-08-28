import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

type DatabaseConstraint = {
  tableName: string;
  constraintType: 'f' | 'p' | 'u';
  columns: string[];
};

type DatabaseColumn = {
  tableName: string;
  columnName: string;
  isNullable: 'YES' | 'NO';
};

describe('Identity and supplier persistence contract', () => {
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

  it('exposes the Better Auth and marketplace identity tables', async () => {
    const tables = await prisma.$queryRaw<Array<{ tableName: string }>>`
      SELECT table_name AS "tableName"
      FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name IN (
          'User',
          'Session',
          'Account',
          'Verification',
          'CustomerProfile',
          'SavedVehicle',
          'Address',
          'Supplier',
          'SupplierUser'
        )
      ORDER BY table_name
    `;

    expect(tables.map(({ tableName }) => tableName)).toEqual([
      'Account',
      'Address',
      'CustomerProfile',
      'SavedVehicle',
      'Session',
      'Supplier',
      'SupplierUser',
      'User',
      'Verification',
    ]);
  });

  it('persists only the agreed user roles and supplier membership states', async () => {
    const enumValues = await prisma.$queryRaw<
      Array<{ enumName: string; enumValue: string }>
    >`
      SELECT type.typname AS "enumName", value.enumlabel AS "enumValue"
      FROM pg_type AS type
      JOIN pg_enum AS value ON value.enumtypid = type.oid
      JOIN pg_namespace AS namespace ON namespace.oid = type.typnamespace
      WHERE namespace.nspname = current_schema()
        AND type.typname IN ('UserRole', 'SupplierUserStatus')
      ORDER BY type.typname, value.enumsortorder
    `;

    expect(
      enumValues
        .filter(({ enumName }) => enumName === 'UserRole')
        .map(({ enumValue }) => enumValue),
    ).toEqual(['CUSTOMER', 'SUPPLIER_USER', 'SUPPORT_MANAGER', 'ADMIN']);
    expect(
      enumValues
        .filter(({ enumName }) => enumName === 'SupplierUserStatus')
        .map(({ enumValue }) => enumValue),
    ).toEqual(['ACTIVE', 'DISABLED']);
    expect(enumValues).not.toContainEqual(
      expect.objectContaining({ enumValue: 'GUEST' }),
    );
  });

  it('stores an exact vehicle year and one nullable active vehicle reference', async () => {
    const columns = await prisma.$queryRaw<DatabaseColumn[]>`
      SELECT
        table_name AS "tableName",
        column_name AS "columnName",
        is_nullable AS "isNullable"
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND (
          (table_name = 'SavedVehicle' AND column_name = 'year')
          OR (table_name = 'User' AND column_name = 'activeSavedVehicleId')
        )
      ORDER BY table_name, column_name
    `;

    expect(columns).toEqual([
      {
        tableName: 'SavedVehicle',
        columnName: 'year',
        isNullable: 'NO',
      },
      {
        tableName: 'User',
        columnName: 'activeSavedVehicleId',
        isNullable: 'YES',
      },
    ]);
  });

  it('enforces identity uniqueness and supplier ownership relations', async () => {
    const constraints = await prisma.$queryRaw<DatabaseConstraint[]>`
      WITH foreign_keys AS (
        SELECT
          table_definition.relname AS "tableName",
          constraint_definition.contype::TEXT AS "constraintType",
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
        GROUP BY
          table_definition.relname,
          constraint_definition.oid,
          constraint_definition.contype
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
      SELECT *
      FROM foreign_keys
      WHERE "tableName" IN (
        'User',
        'Session',
        'Account',
        'CustomerProfile',
        'SavedVehicle',
        'Supplier',
        'SupplierUser'
      )
      UNION ALL
      SELECT *
      FROM unique_indexes
      WHERE "tableName" IN (
        'User',
        'Session',
        'Account',
        'CustomerProfile',
        'SavedVehicle',
        'Supplier',
        'SupplierUser'
      )
    `;

    expect(constraints).toEqual(
      expect.arrayContaining([
        { tableName: 'User', constraintType: 'u', columns: ['email'] },
        {
          tableName: 'User',
          constraintType: 'u',
          columns: ['activeSavedVehicleId'],
        },
        {
          tableName: 'User',
          constraintType: 'f',
          columns: ['activeSavedVehicleId'],
        },
        { tableName: 'Session', constraintType: 'u', columns: ['token'] },
        {
          tableName: 'Account',
          constraintType: 'u',
          columns: ['providerId', 'accountId'],
        },
        {
          tableName: 'CustomerProfile',
          constraintType: 'u',
          columns: ['userId'],
        },
        { tableName: 'Supplier', constraintType: 'u', columns: ['slug'] },
        {
          tableName: 'SupplierUser',
          constraintType: 'u',
          columns: ['userId'],
        },
        {
          tableName: 'SupplierUser',
          constraintType: 'f',
          columns: ['userId'],
        },
        {
          tableName: 'SupplierUser',
          constraintType: 'f',
          columns: ['supplierId'],
        },
        {
          tableName: 'SavedVehicle',
          constraintType: 'f',
          columns: ['userId'],
        },
        {
          tableName: 'SavedVehicle',
          constraintType: 'f',
          columns: ['engineTypeId', 'vehicleGenerationId'],
        },
      ]),
    );
  });
});
