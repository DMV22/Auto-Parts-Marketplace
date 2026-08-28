-- Abort instead of silently rewriting invalid historical inventory.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Listing" WHERE "stockQuantity" < 0) THEN
    RAISE EXCEPTION 'Cannot add non-negative stock constraint: negative Listing.stockQuantity rows exist';
  END IF;
END $$;

-- AlterTable
ALTER TABLE "Listing"
ADD COLUMN "inventoryVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Listing"
ADD CONSTRAINT "Listing_stockQuantity_nonnegative_check"
CHECK ("stockQuantity" >= 0);
