-- CreateEnum
CREATE TYPE "FitmentRuleEffect" AS ENUM ('COMPATIBLE', 'INCOMPATIBLE');

-- Existing rules were positive-only before Milestone 7.4.
ALTER TABLE "FitmentRule" ADD COLUMN "effect" "FitmentRuleEffect";

UPDATE "FitmentRule"
SET "effect" = 'COMPATIBLE'
WHERE "effect" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "FitmentRule" WHERE "effect" IS NULL) THEN
    RAISE EXCEPTION 'FitmentRule.effect backfill left NULL rows';
  END IF;
END $$;

ALTER TABLE "FitmentRule" ALTER COLUMN "effect" SET NOT NULL;
