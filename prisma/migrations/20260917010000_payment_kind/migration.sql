-- CreateEnum
CREATE TYPE "CollectionPaymentKind" AS ENUM ('ABONO', 'ACUERDO');

-- AlterTable
ALTER TABLE "CollectionPayment" ADD COLUMN "kind" "CollectionPaymentKind" NOT NULL DEFAULT 'ABONO';
