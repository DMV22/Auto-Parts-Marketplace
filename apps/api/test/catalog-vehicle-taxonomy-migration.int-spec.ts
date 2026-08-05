import 'dotenv/config';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { getPrismaDatabaseUrl } from '../src/prisma/prisma-database-url';

const apiRoot = resolve(__dirname, '..');
const legacyMigrationPath = resolve(
  apiRoot,
  'prisma',
  'migrations',
  '20260804165149_add_part_vehicle_fitment',
  'migration.sql',
);
const taxonomyMigrationPath = resolve(
  apiRoot,
  'prisma',
  'migrations',
  '20260805035541_migrate_catalog_vehicle_taxonomy',
  'migration.sql',
);
const legacyMigrationSql = readFileSync(legacyMigrationPath, 'utf8');
const taxonomyMigrationSql = readFileSync(taxonomyMigrationPath, 'utf8');

describe('Catalog and vehicle taxonomy migration', () => {
  const schemaName = `milestone_6_1_${randomUUID().replaceAll('-', '')}`;
  let client: Client;

  beforeAll(async () => {
    client = new Client({ connectionString: getPrismaDatabaseUrl() });
    await client.connect();
    await client.query(`CREATE SCHEMA "${schemaName}"`);
    await client.query(`SET search_path TO "${schemaName}"`);
  });

  afterAll(async () => {
    if (client) {
      if (!/^milestone_6_1_[a-f0-9]{32}$/.test(schemaName)) {
        throw new Error(`Unsafe migration test schema: ${schemaName}`);
      }

      await client.query('RESET search_path');
      await client.query(`DROP SCHEMA "${schemaName}" CASCADE`);
      await client.end();
    }
  });

  it('keeps the original committed migration immutable and guards legacy drops', () => {
    const legacyMigrationHash = createHash('sha256')
      .update(readFileSync(legacyMigrationPath))
      .digest('hex');
    const verificationPosition = taxonomyMigrationSql.indexOf('DO $$');
    const firstDropPosition = taxonomyMigrationSql.indexOf(
      'DROP TABLE "Fitment"',
    );

    expect(legacyMigrationHash).toBe(
      '53e3f87a07e0cc4854cc62dfc8fb1a32d4bb811cd0e0796f5ede06263ab7f1fe',
    );
    expect(verificationPosition).toBeGreaterThan(-1);
    expect(firstDropPosition).toBeGreaterThan(verificationPosition);
    expect(taxonomyMigrationSql).toContain(
      'Part to Product backfill count mismatch',
    );
    expect(taxonomyMigrationSql).toContain(
      'Part to ProductVariant backfill count mismatch',
    );
    expect(taxonomyMigrationSql).toContain(
      'Vehicle to VehicleGeneration backfill count mismatch',
    );
    expect(taxonomyMigrationSql).toContain(
      'Fitment to FitmentRule backfill count mismatch',
    );
  });

  it('preserves legacy rows while replacing Part, Vehicle, and Fitment', async () => {
    const firstPartId = randomUUID();
    const secondPartId = randomUUID();
    const firstVehicleId = randomUUID();
    const secondVehicleId = randomUUID();

    await client.query(legacyMigrationSql);
    await client.query(
      `INSERT INTO "Part"
        ("id", "name", "manufacturer", "manufacturerPartNumber", "createdAt", "updatedAt")
       VALUES
        ($1, 'Front brake pad set', 'Brembo', 'P85020', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ($2, 'Rear brake pad set', 'Brembo', 'P85021', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [firstPartId, secondPartId],
    );
    await client.query(
      `INSERT INTO "Vehicle"
        ("id", "make", "model", "year", "createdAt", "updatedAt")
       VALUES
        ($1, 'Volkswagen', 'Golf', 2020, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ($2, 'Volkswagen', 'Golf', 2021, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [firstVehicleId, secondVehicleId],
    );
    await client.query(
      `INSERT INTO "Fitment" ("partId", "vehicleId", "createdAt")
       VALUES ($1, $2, CURRENT_TIMESTAMP), ($3, $4, CURRENT_TIMESTAMP)`,
      [firstPartId, firstVehicleId, secondPartId, secondVehicleId],
    );

    await client.query(taxonomyMigrationSql);

    const counts = await client.query<{
      brands: number;
      products: number;
      variants: number;
      makes: number;
      models: number;
      generations: number;
      engines: number;
      rules: number;
    }>(`SELECT
      (SELECT COUNT(*)::INT FROM "Brand") AS brands,
      (SELECT COUNT(*)::INT FROM "Product") AS products,
      (SELECT COUNT(*)::INT FROM "ProductVariant") AS variants,
      (SELECT COUNT(*)::INT FROM "VehicleMake") AS makes,
      (SELECT COUNT(*)::INT FROM "VehicleModel") AS models,
      (SELECT COUNT(*)::INT FROM "VehicleGeneration") AS generations,
      (SELECT COUNT(*)::INT FROM "EngineType") AS engines,
      (SELECT COUNT(*)::INT FROM "FitmentRule") AS rules`);
    const migratedVariant = await client.query<{
      id: string;
      productId: string;
      manufacturerPartNumber: string;
      sku: string;
    }>(
      `SELECT "id", "productId", "manufacturerPartNumber", "sku"
       FROM "ProductVariant" WHERE "id" = $1`,
      [firstPartId],
    );
    const migratedGeneration = await client.query<{
      id: string;
      name: string | null;
      yearFrom: number;
      yearTo: number;
    }>(
      `SELECT "id", "name", "yearFrom", "yearTo"
       FROM "VehicleGeneration" WHERE "id" = $1`,
      [firstVehicleId],
    );
    const migratedRule = await client.query<{
      productVariantId: string;
      vehicleGenerationId: string;
      engineTypeId: string | null;
    }>(
      `SELECT "productVariantId", "vehicleGenerationId", "engineTypeId"
       FROM "FitmentRule"
       WHERE "productVariantId" = $1 AND "vehicleGenerationId" = $2`,
      [firstPartId, firstVehicleId],
    );
    const legacyTables = await client.query<{
      part: string | null;
      vehicle: string | null;
      fitment: string | null;
    }>(`SELECT
      to_regclass('"Part"')::TEXT AS part,
      to_regclass('"Vehicle"')::TEXT AS vehicle,
      to_regclass('"Fitment"')::TEXT AS fitment`);

    expect(counts.rows[0]).toEqual({
      brands: 1,
      products: 2,
      variants: 2,
      makes: 1,
      models: 1,
      generations: 2,
      engines: 0,
      rules: 2,
    });
    expect(migratedVariant.rows[0]).toMatchObject({
      id: firstPartId,
      productId: firstPartId,
      manufacturerPartNumber: 'P85020',
    });
    expect(migratedVariant.rows[0].sku).toContain('P85020-');
    expect(migratedGeneration.rows[0]).toEqual({
      id: firstVehicleId,
      name: null,
      yearFrom: 2020,
      yearTo: 2020,
    });
    expect(migratedRule.rows[0]).toEqual({
      productVariantId: firstPartId,
      vehicleGenerationId: firstVehicleId,
      engineTypeId: null,
    });
    expect(legacyTables.rows[0]).toEqual({
      part: null,
      vehicle: null,
      fitment: null,
    });
  });
});
