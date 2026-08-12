-- CreateEnum
CREATE TYPE "ListingCondition" AS ENUM ('NEW', 'USED', 'REMANUFACTURED');

-- Add the column as nullable so existing listings can be classified explicitly.
ALTER TABLE "Listing" ADD COLUMN "condition" "ListingCondition";

-- Milestone 6 listings are synthetic baseline data and are classified as new.
UPDATE "Listing"
SET "condition" = 'NEW'
WHERE "condition" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Listing" WHERE "condition" IS NULL) THEN
    RAISE EXCEPTION 'Listing.condition backfill left NULL rows';
  END IF;
END $$;

ALTER TABLE "Listing" ALTER COLUMN "condition" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Listing_status_condition_currency_price_idx" ON "Listing"("status", "condition", "currency", "price");
