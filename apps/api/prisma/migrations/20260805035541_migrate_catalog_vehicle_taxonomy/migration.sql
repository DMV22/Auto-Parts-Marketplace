BEGIN;

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" UUID,
    "brandId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "manufacturerPartNumber" TEXT NOT NULL,
    "oemNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleMake" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleMake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleModel" (
    "id" UUID NOT NULL,
    "vehicleMakeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleGeneration" (
    "id" UUID NOT NULL,
    "vehicleModelId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "yearFrom" INTEGER NOT NULL,
    "yearTo" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleGeneration_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VehicleGeneration_year_range_check" CHECK ("yearFrom" <= "yearTo")
);

-- CreateTable
CREATE TABLE "EngineType" (
    "id" UUID NOT NULL,
    "vehicleGenerationId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngineType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FitmentRule" (
    "id" UUID NOT NULL,
    "productVariantId" UUID NOT NULL,
    "vehicleGenerationId" UUID NOT NULL,
    "engineTypeId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FitmentRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_manufacturerPartNumber_key" ON "ProductVariant"("productId", "manufacturerPartNumber");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleMake_name_key" ON "VehicleMake"("name");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleModel_vehicleMakeId_name_key" ON "VehicleModel"("vehicleMakeId", "name");

-- CreateIndex
CREATE INDEX "VehicleModel_vehicleMakeId_idx" ON "VehicleModel"("vehicleMakeId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleGeneration_vehicleModelId_code_key" ON "VehicleGeneration"("vehicleModelId", "code");

-- CreateIndex
CREATE INDEX "VehicleGeneration_vehicleModelId_idx" ON "VehicleGeneration"("vehicleModelId");

-- CreateIndex
CREATE INDEX "VehicleGeneration_yearFrom_yearTo_idx" ON "VehicleGeneration"("yearFrom", "yearTo");

-- CreateIndex
CREATE UNIQUE INDEX "EngineType_id_vehicleGenerationId_key" ON "EngineType"("id", "vehicleGenerationId");

-- CreateIndex
CREATE UNIQUE INDEX "EngineType_vehicleGenerationId_code_key" ON "EngineType"("vehicleGenerationId", "code");

-- CreateIndex
CREATE INDEX "EngineType_vehicleGenerationId_idx" ON "EngineType"("vehicleGenerationId");

-- CreateIndex
CREATE UNIQUE INDEX "FitmentRule_productVariantId_vehicleGenerationId_engineTypeId_key"
ON "FitmentRule"("productVariantId", "vehicleGenerationId", "engineTypeId");

-- PostgreSQL permits multiple NULL values in a regular unique index. This
-- partial index preserves uniqueness for generation-level rules without an engine.
CREATE UNIQUE INDEX "FitmentRule_productVariantId_vehicleGenerationId_generic_key"
ON "FitmentRule"("productVariantId", "vehicleGenerationId")
WHERE "engineTypeId" IS NULL;

-- CreateIndex
CREATE INDEX "FitmentRule_productVariantId_idx" ON "FitmentRule"("productVariantId");

-- CreateIndex
CREATE INDEX "FitmentRule_vehicleGenerationId_idx" ON "FitmentRule"("vehicleGenerationId");

-- CreateIndex
CREATE INDEX "FitmentRule_engineTypeId_idx" ON "FitmentRule"("engineTypeId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_vehicleMakeId_fkey" FOREIGN KEY ("vehicleMakeId") REFERENCES "VehicleMake"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleGeneration" ADD CONSTRAINT "VehicleGeneration_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "VehicleModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineType" ADD CONSTRAINT "EngineType_vehicleGenerationId_fkey" FOREIGN KEY ("vehicleGenerationId") REFERENCES "VehicleGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FitmentRule" ADD CONSTRAINT "FitmentRule_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FitmentRule" ADD CONSTRAINT "FitmentRule_vehicleGenerationId_fkey" FOREIGN KEY ("vehicleGenerationId") REFERENCES "VehicleGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey. The composite reference prevents an engine from being paired
-- with a VehicleGeneration that does not own it.
ALTER TABLE "FitmentRule" ADD CONSTRAINT "FitmentRule_engineTypeId_vehicleGenerationId_fkey" FOREIGN KEY ("engineTypeId", "vehicleGenerationId") REFERENCES "EngineType"("id", "vehicleGenerationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill Brand from the legacy manufacturer vocabulary. The hash creates a
-- deterministic UUID without relying on an extension or random generation.
INSERT INTO "Brand" ("id", "name", "createdAt", "updatedAt")
SELECT
    md5('brand:' || "manufacturer")::UUID,
    "manufacturer",
    MIN("createdAt"),
    MAX("updatedAt")
FROM "Part"
GROUP BY "manufacturer";

-- Every legacy Part becomes an initial Product and one ProductVariant. Reusing
-- the legacy UUID in both target tables keeps all Fitment references stable.
INSERT INTO "Product" ("id", "name", "description", "categoryId", "brandId", "createdAt", "updatedAt")
SELECT
    "id",
    "name",
    NULL,
    NULL,
    md5('brand:' || "manufacturer")::UUID,
    "createdAt",
    "updatedAt"
FROM "Part";

INSERT INTO "ProductVariant" ("id", "productId", "sku", "manufacturerPartNumber", "oemNumber", "createdAt", "updatedAt")
SELECT
    "id",
    "id",
    "manufacturerPartNumber" || '-' || replace("id"::TEXT, '-', ''),
    "manufacturerPartNumber",
    NULL,
    "createdAt",
    "updatedAt"
FROM "Part";

-- Normalize the legacy make/model strings. Hash-derived identifiers are stable
-- across repeated migration rehearsals and do not require invented catalog data.
INSERT INTO "VehicleMake" ("id", "name", "createdAt", "updatedAt")
SELECT
    md5('vehicle-make:' || "make")::UUID,
    "make",
    MIN("createdAt"),
    MAX("updatedAt")
FROM "Vehicle"
GROUP BY "make";

INSERT INTO "VehicleModel" ("id", "vehicleMakeId", "name", "createdAt", "updatedAt")
SELECT
    md5('vehicle-model:' || jsonb_build_array("make", "model")::TEXT)::UUID,
    md5('vehicle-make:' || "make")::UUID,
    "model",
    MIN("createdAt"),
    MAX("updatedAt")
FROM "Vehicle"
GROUP BY "make", "model";

-- Legacy Vehicle rows do not contain generation or engine data. Preserve each
-- exact model-year as an explicitly unnamed generation and leave EngineType empty.
INSERT INTO "VehicleGeneration" ("id", "vehicleModelId", "code", "name", "yearFrom", "yearTo", "createdAt", "updatedAt")
SELECT
    "id",
    md5('vehicle-model:' || jsonb_build_array("make", "model")::TEXT)::UUID,
    'legacy-' || "year"::TEXT || '-' || replace("id"::TEXT, '-', ''),
    NULL,
    "year",
    "year",
    "createdAt",
    "updatedAt"
FROM "Vehicle";

-- A legacy Fitment is generation-level because the source has no engine data.
INSERT INTO "FitmentRule" ("id", "productVariantId", "vehicleGenerationId", "engineTypeId", "createdAt")
SELECT
    md5('fitment-rule:' || "partId"::TEXT || ':' || "vehicleId"::TEXT)::UUID,
    "partId",
    "vehicleId",
    NULL,
    "createdAt"
FROM "Fitment";

-- Abort the transaction before dropping legacy tables if any row failed to map.
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM "Part") <> (SELECT COUNT(*) FROM "Product") THEN
        RAISE EXCEPTION 'Part to Product backfill count mismatch';
    END IF;

    IF (SELECT COUNT(*) FROM "Part") <> (SELECT COUNT(*) FROM "ProductVariant") THEN
        RAISE EXCEPTION 'Part to ProductVariant backfill count mismatch';
    END IF;

    IF (SELECT COUNT(*) FROM "Vehicle") <> (SELECT COUNT(*) FROM "VehicleGeneration") THEN
        RAISE EXCEPTION 'Vehicle to VehicleGeneration backfill count mismatch';
    END IF;

    IF (SELECT COUNT(*) FROM "Fitment") <> (SELECT COUNT(*) FROM "FitmentRule") THEN
        RAISE EXCEPTION 'Fitment to FitmentRule backfill count mismatch';
    END IF;
END $$;

-- Remove legacy tables only after successful backfill and verification.
DROP TABLE "Fitment";
DROP TABLE "Part";
DROP TABLE "Vehicle";

COMMIT;
