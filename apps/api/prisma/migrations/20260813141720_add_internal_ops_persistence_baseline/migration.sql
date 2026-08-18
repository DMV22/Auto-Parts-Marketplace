-- CreateEnum
CREATE TYPE "ActivityResourceType" AS ENUM ('ORDER', 'RETURN_REQUEST', 'LISTING', 'NOTE');

-- AlterEnum
ALTER TYPE "OrderStatusEventSource" ADD VALUE 'INTERNAL_OPS';

-- AlterEnum
ALTER TYPE "ReturnRequestStatus" ADD VALUE 'UNDER_REVIEW';

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "moderationReason" VARCHAR(500);

-- AlterTable
ALTER TABLE "ReturnRequest" ADD COLUMN     "createdByUserId" UUID,
ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "decidedByUserId" UUID,
ADD COLUMN     "decisionReason" VARCHAR(500);

-- CreateTable
CREATE TABLE "Note" (
    "id" UUID NOT NULL,
    "orderId" UUID,
    "returnRequestId" UUID,
    "authorUserId" UUID NOT NULL,
    "correctsNoteId" UUID,
    "body" TEXT NOT NULL,
    "redactedAt" TIMESTAMP(3),
    "redactedByUserId" UUID,
    "redactionReason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" UUID NOT NULL,
    "actorUserId" UUID,
    "actorRole" "UserRole",
    "resourceType" "ActivityResourceType" NOT NULL,
    "resourceId" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "previousStatus" VARCHAR(50),
    "newStatus" VARCHAR(50),
    "reason" VARCHAR(500),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- Abort instead of silently rewriting existing return data if the new
-- unfinished-request invariant is already violated.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "ReturnRequest"
        WHERE "status" NOT IN ('REJECTED', 'COMPLETED', 'CANCELLED')
        GROUP BY "orderItemId"
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot enforce one unfinished ReturnRequest per OrderItem: conflicting rows exist';
    END IF;
END $$;

-- A Note belongs to exactly one operational target.
ALTER TABLE "Note"
ADD CONSTRAINT "Note_exactly_one_target_check"
CHECK (("orderId" IS NULL) <> ("returnRequestId" IS NULL));

-- CreateIndex
CREATE INDEX "Note_orderId_createdAt_id_idx" ON "Note"("orderId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Note_returnRequestId_createdAt_id_idx" ON "Note"("returnRequestId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Note_authorUserId_idx" ON "Note"("authorUserId");

-- CreateIndex
CREATE INDEX "Note_correctsNoteId_idx" ON "Note"("correctsNoteId");

-- CreateIndex
CREATE INDEX "Note_redactedByUserId_idx" ON "Note"("redactedByUserId");

-- CreateIndex
CREATE INDEX "ActivityLog_resourceType_resourceId_createdAt_id_idx" ON "ActivityLog"("resourceType", "resourceId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "ActivityLog_actorUserId_createdAt_id_idx" ON "ActivityLog"("actorUserId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "ActivityLog_action_createdAt_id_idx" ON "ActivityLog"("action", "createdAt", "id");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_id_idx" ON "ActivityLog"("createdAt", "id");

-- CreateIndex
CREATE INDEX "ReturnRequest_status_createdAt_id_idx" ON "ReturnRequest"("status", "createdAt", "id");

-- CreateIndex
CREATE INDEX "ReturnRequest_createdByUserId_idx" ON "ReturnRequest"("createdByUserId");

-- CreateIndex
CREATE INDEX "ReturnRequest_decidedByUserId_idx" ON "ReturnRequest"("decidedByUserId");

-- Completed, rejected and cancelled requests remain historical records while
-- only one unfinished workflow may exist for an OrderItem.
CREATE UNIQUE INDEX "ReturnRequest_one_unfinished_per_orderItem_idx"
ON "ReturnRequest"("orderItemId")
WHERE "status" NOT IN ('REJECTED', 'COMPLETED', 'CANCELLED');

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_correctsNoteId_fkey" FOREIGN KEY ("correctsNoteId") REFERENCES "Note"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_redactedByUserId_fkey" FOREIGN KEY ("redactedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
