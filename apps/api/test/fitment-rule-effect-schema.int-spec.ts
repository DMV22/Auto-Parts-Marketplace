/* eslint-disable no-unsafe-finally */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { Client } from 'pg';
import { PrismaModule } from '../src/prisma/prisma.module';
import { getPrismaDatabaseUrl } from '../src/prisma/prisma-database-url';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Fitment rule effect persistence contract', () => {
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

  it('persists the explicit effect vocabulary as a required field', async () => {
    const enumValues = await prisma.$queryRaw<Array<{ value: string }>>`
      SELECT enum_value.enumlabel AS value
      FROM pg_type AS enum_type
      JOIN pg_enum AS enum_value ON enum_value.enumtypid = enum_type.oid
      JOIN pg_namespace AS namespace ON namespace.oid = enum_type.typnamespace
      WHERE namespace.nspname = current_schema()
        AND enum_type.typname = 'FitmentRuleEffect'
      ORDER BY enum_value.enumsortorder
    `;
    const [column] = await prisma.$queryRaw<
      Array<{ isNullable: string; columnDefault: string | null }>
    >`
      SELECT
        is_nullable AS "isNullable",
        column_default AS "columnDefault"
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'FitmentRule'
        AND column_name = 'effect'
    `;

    expect(enumValues.map(({ value }) => value)).toEqual([
      'COMPATIBLE',
      'INCOMPATIBLE',
    ]);
    expect(column).toEqual({ isNullable: 'NO', columnDefault: null });
  });

  it('preserves existing positive rules as compatible', async () => {
    const schemaName = `fitment_effect_${randomUUID().replaceAll('-', '')}`;
    const client = new Client({ connectionString: getPrismaDatabaseUrl() });
    const migrationSql = readFileSync(
      resolve(
        __dirname,
        '..',
        'prisma',
        'migrations',
        '20260807230819_add_fitment_rule_effect',
        'migration.sql',
      ),
      'utf8',
    );

    try {
      await client.connect();
      await client.query(`CREATE SCHEMA "${schemaName}"`);
      await client.query(`SET search_path TO "${schemaName}"`);
      await client.query('CREATE TABLE "FitmentRule" ("id" UUID PRIMARY KEY)');
      const ruleId = randomUUID();
      await client.query('INSERT INTO "FitmentRule" ("id") VALUES ($1)', [
        ruleId,
      ]);
      await client.query(migrationSql);

      const result = await client.query<{ effect: string }>(
        'SELECT "effect"::TEXT AS effect FROM "FitmentRule" WHERE "id" = $1',
        [ruleId],
      );
      expect(result.rows).toEqual([{ effect: 'COMPATIBLE' }]);
    } finally {
      if (!/^fitment_effect_[a-f0-9]{32}$/.test(schemaName)) {
        throw new Error(`Unsafe migration test schema: ${schemaName}`);
      }
      await client.query('RESET search_path');
      await client.query(`DROP SCHEMA "${schemaName}" CASCADE`);
      await client.end();
    }
  });
});
