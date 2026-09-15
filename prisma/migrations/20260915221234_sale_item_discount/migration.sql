-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SaleItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "discountPercent" REAL NOT NULL DEFAULT 0,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "subtotal" INTEGER NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SaleItem" ("id", "notes", "position", "productId", "quantity", "saleId", "subtotal", "taxAmount", "total", "unitPrice") SELECT "id", "notes", "position", "productId", "quantity", "saleId", "subtotal", "taxAmount", "total", "unitPrice" FROM "SaleItem";
DROP TABLE "SaleItem";
ALTER TABLE "new_SaleItem" RENAME TO "SaleItem";
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");
CREATE INDEX "SaleItem_productId_idx" ON "SaleItem"("productId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
