-- Lightweight CRM: extend Customer with contact/commercial-terms fields and
-- an assigned seller, and add a CustomerActivity ledger for seguimiento
-- comercial (visitas/llamadas/whatsapp).

-- New enums
CREATE TYPE "CustomerActivityType" AS ENUM ('VISITA', 'LLAMADA', 'WHATSAPP');
CREATE TYPE "CustomerActivityStatus" AS ENUM ('PENDIENTE', 'COMPLETADA');

-- Extend Customer
ALTER TABLE "Customer"
  ADD COLUMN "city" TEXT,
  ADD COLUMN "contactName" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "birthdayMonth" INTEGER,
  ADD COLUMN "birthdayDay" INTEGER,
  ADD COLUMN "customerSince" TIMESTAMP(3),
  ADD COLUMN "paymentTermsDays" INTEGER,
  ADD COLUMN "discountPercent" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN "assignedSellerId" TEXT;

CREATE INDEX "Customer_assignedSellerId_idx" ON "Customer"("assignedSellerId");
CREATE INDEX "Customer_birthdayMonth_birthdayDay_idx" ON "Customer"("birthdayMonth", "birthdayDay");

ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_assignedSellerId_fkey"
  FOREIGN KEY ("assignedSellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- New CustomerActivity table
CREATE TABLE "CustomerActivity" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "type" "CustomerActivityType" NOT NULL,
  "summary" TEXT NOT NULL,
  "nextAction" TEXT,
  "nextActionDate" TIMESTAMP(3),
  "status" "CustomerActivityStatus" NOT NULL DEFAULT 'PENDIENTE',
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CustomerActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerActivity_customerId_date_idx" ON "CustomerActivity"("customerId", "date");
CREATE INDEX "CustomerActivity_status_nextActionDate_idx" ON "CustomerActivity"("status", "nextActionDate");

ALTER TABLE "CustomerActivity"
  ADD CONSTRAINT "CustomerActivity_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerActivity"
  ADD CONSTRAINT "CustomerActivity_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: assign each existing customer to the seller of their most recent
-- sale, so Vendedor-scoped visibility doesn't leave every pre-existing
-- customer orphaned the moment this ships.
UPDATE "Customer" c
SET "assignedSellerId" = s."sellerId"
FROM (
  SELECT DISTINCT ON ("customerId") "customerId", "sellerId"
  FROM "Sale"
  WHERE "customerId" IS NOT NULL
  ORDER BY "customerId", "date" DESC
) s
WHERE c.id = s."customerId" AND c."assignedSellerId" IS NULL;
