-- Add CONTADORA role (accounting-only access, scoped to Cobranzas)
ALTER TYPE "Role" ADD VALUE 'CONTADORA';

-- Add NOTA_CREDITO payment kind (returned merchandise reduces the document's
-- effective total/saldo without being money received)
ALTER TYPE "CollectionPaymentKind" ADD VALUE 'NOTA_CREDITO';

-- Itemized breakdown of returned models, only populated when kind is
-- NOTA_CREDITO (mirrors the existing "checks" column for method = Cheque)
ALTER TABLE "CollectionPayment" ADD COLUMN "creditItems" JSONB;
