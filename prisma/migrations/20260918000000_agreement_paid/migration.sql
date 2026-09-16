-- AlterTable
ALTER TABLE "CollectionPayment" ADD COLUMN "paid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CollectionPayment" ADD COLUMN "fulfillsAgreementId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CollectionPayment_fulfillsAgreementId_key" ON "CollectionPayment"("fulfillsAgreementId");

-- AddForeignKey
ALTER TABLE "CollectionPayment" ADD CONSTRAINT "CollectionPayment_fulfillsAgreementId_fkey" FOREIGN KEY ("fulfillsAgreementId") REFERENCES "CollectionPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
