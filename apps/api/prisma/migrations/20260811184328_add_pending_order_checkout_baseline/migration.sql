-- CreateEnum
CREATE TYPE "OrderStatusEventSource" AS ENUM ('CHECKOUT', 'STRIPE_WEBHOOK', 'SYSTEM');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "checkoutExpiresAt" TIMESTAMP(3),
ADD COLUMN     "checkoutRequestFingerprint" CHAR(64),
ADD COLUMN     "checkoutRequestId" UUID,
ADD COLUMN     "checkoutSessionId" TEXT,
ADD COLUMN     "checkoutSessionUrl" TEXT,
ADD COLUMN     "guestTokenHash" CHAR(64),
ADD COLUMN     "reservationReleasedAt" TIMESTAMP(3),
ALTER COLUMN "customerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "condition" "ListingCondition",
ADD COLUMN     "manufacturerPartNumber" TEXT,
ADD COLUMN     "productName" TEXT,
ADD COLUMN     "sku" TEXT,
ADD COLUMN     "supplierName" TEXT;

-- CreateTable
CREATE TABLE "OrderStatusEvent" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "source" "OrderStatusEventSource" NOT NULL,
    "paymentEventId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusEvent_pkey" PRIMARY KEY ("id")
);

-- Checkout invariants. Nullable checkout fields preserve legacy baseline rows;
-- runtime-created checkout Orders must populate the complete field group.
ALTER TABLE "Order"
ADD CONSTRAINT "Order_owner_check" CHECK (
    ("customerId" IS NOT NULL AND "guestTokenHash" IS NULL)
    OR ("customerId" IS NULL AND "guestTokenHash" IS NOT NULL)
),
ADD CONSTRAINT "Order_guest_hash_format_check" CHECK (
    "guestTokenHash" IS NULL
    OR "guestTokenHash" ~ '^[a-f0-9]{64}$'
),
ADD CONSTRAINT "Order_checkout_request_fields_check" CHECK (
    ("checkoutRequestId" IS NULL AND "checkoutRequestFingerprint" IS NULL AND "checkoutExpiresAt" IS NULL)
    OR ("checkoutRequestId" IS NOT NULL AND "checkoutRequestFingerprint" IS NOT NULL AND "checkoutExpiresAt" IS NOT NULL)
),
ADD CONSTRAINT "Order_checkout_request_fingerprint_check" CHECK (
    "checkoutRequestFingerprint" IS NULL
    OR "checkoutRequestFingerprint" ~ '^[a-f0-9]{64}$'
),
ADD CONSTRAINT "Order_checkout_session_fields_check" CHECK (
    ("checkoutSessionId" IS NULL AND "checkoutSessionUrl" IS NULL)
    OR ("checkoutSessionId" IS NOT NULL AND "checkoutSessionUrl" IS NOT NULL)
),
ADD CONSTRAINT "Order_total_amount_check" CHECK ("totalAmount" >= 0),
ADD CONSTRAINT "Order_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
ADD CONSTRAINT "Order_checkout_expiry_check" CHECK (
    "checkoutExpiresAt" IS NULL OR "checkoutExpiresAt" > "createdAt"
);

ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_quantity_check" CHECK ("quantity" > 0),
ADD CONSTRAINT "OrderItem_unit_price_check" CHECK ("unitPrice" >= 0),
ADD CONSTRAINT "OrderItem_snapshot_fields_check" CHECK (
    ("productName" IS NULL AND "sku" IS NULL AND "manufacturerPartNumber" IS NULL AND "condition" IS NULL AND "supplierName" IS NULL)
    OR ("productName" IS NOT NULL AND "sku" IS NOT NULL AND "manufacturerPartNumber" IS NOT NULL AND "condition" IS NOT NULL AND "supplierName" IS NOT NULL)
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderStatusEvent_paymentEventId_key" ON "OrderStatusEvent"("paymentEventId");

-- CreateIndex
CREATE INDEX "OrderStatusEvent_orderId_createdAt_idx" ON "OrderStatusEvent"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_checkoutRequestId_key" ON "Order"("checkoutRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_checkoutSessionId_key" ON "Order"("checkoutSessionId");

-- CreateIndex
CREATE INDEX "Order_guestTokenHash_status_idx" ON "Order"("guestTokenHash", "status");

-- CreateIndex
CREATE INDEX "Order_status_checkoutExpiresAt_idx" ON "Order"("status", "checkoutExpiresAt");

-- AddForeignKey
ALTER TABLE "OrderStatusEvent" ADD CONSTRAINT "OrderStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusEvent" ADD CONSTRAINT "OrderStatusEvent_paymentEventId_fkey" FOREIGN KEY ("paymentEventId") REFERENCES "PaymentEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
