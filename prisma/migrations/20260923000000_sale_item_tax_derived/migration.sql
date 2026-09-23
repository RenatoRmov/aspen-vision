-- IVA is now computed once per sale from the sum of line subtotals (see
-- src/lib/sale-totals.ts), never accumulated from independently-rounded
-- per-line amounts — so SaleItem no longer stores its own tax/total.
ALTER TABLE "SaleItem" DROP COLUMN "taxAmount";
ALTER TABLE "SaleItem" DROP COLUMN "total";
