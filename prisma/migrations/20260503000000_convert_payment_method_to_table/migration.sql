-- Migration: Convert PaymentMethod enum to PaymentMethodConfig table
-- This migration handles existing data in the sales table

-- 1. Create the PaymentMethodConfig table
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- Create unique index on code
CREATE UNIQUE INDEX "payment_methods_code_key" ON "payment_methods"("code");

-- Create index on active
CREATE INDEX "payment_methods_active_idx" ON "payment_methods"("active");

-- Create index on sortOrder
CREATE INDEX "payment_methods_sortOrder_idx" ON "payment_methods"("sortOrder");

-- 2. Insert default payment methods from the old enum
INSERT INTO "payment_methods" ("id", "code", "name", "icon", "active", "sortOrder", "updatedAt")
VALUES
    (gen_random_uuid(), 'EFECTIVO', 'Efectivo', '💵', true, 0, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'TRANSFERENCIA', 'Transferencia', '🏦', true, 1, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'TARJETA', 'Tarjeta', '💳', true, 2, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'QR', 'QR', '📱', true, 3, CURRENT_TIMESTAMP);

-- 3. Add paymentMethodId column to sales table (nullable first)
ALTER TABLE "sales" ADD COLUMN "paymentMethodId" TEXT;

-- 4. Migrate existing data: map old enum values to new IDs
UPDATE "sales" s
SET "paymentMethodId" = pm."id"
FROM "payment_methods" pm
WHERE s."paymentMethod"::TEXT = pm."code";

-- 5. Make paymentMethodId NOT NULL after data migration
ALTER TABLE "sales" ALTER COLUMN "paymentMethodId" SET NOT NULL;

-- 6. Add foreign key constraint
ALTER TABLE "sales" ADD CONSTRAINT "sales_paymentMethodId_fkey"
    FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7. Create index on paymentMethodId
CREATE INDEX "sales_paymentMethodId_idx" ON "sales"("paymentMethodId");

-- 8. Drop the old enum column
ALTER TABLE "sales" DROP COLUMN "paymentMethod";

-- 9. Drop the old enum type (optional - only if not used elsewhere)
-- DROP TYPE "PaymentMethod";
