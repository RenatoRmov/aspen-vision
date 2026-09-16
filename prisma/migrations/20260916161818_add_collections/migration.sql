-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "city" TEXT NOT NULL,
    "clientRut" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "documentDate" DATETIME NOT NULL,
    "netAmount" INTEGER NOT NULL,
    "taxAmount" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CollectionPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollectionPayment_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CollectionPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Collection_documentDate_idx" ON "Collection"("documentDate");

-- CreateIndex
CREATE INDEX "Collection_clientRut_idx" ON "Collection"("clientRut");

-- CreateIndex
CREATE INDEX "Collection_folio_idx" ON "Collection"("folio");

-- CreateIndex
CREATE INDEX "CollectionPayment_collectionId_idx" ON "CollectionPayment"("collectionId");
