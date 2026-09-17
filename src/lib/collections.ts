/** Pure helpers for Cobranzas — no DB/server dependency so both server queries and client forms can share the same rules. */

export type CollectionEstado = "PAGADA" | "PENDIENTE" | "PARCIAL" | "A_FAVOR";

export function computeSaldo(totalAmount: number, totalPaid: number): number {
  return totalAmount - totalPaid;
}

/**
 * Saldo 0 = pagada; saldo igual al total = nada abonado aún (pendiente);
 * saldo negativo = pagó de más (a favor); cualquier otro caso = parcial.
 */
export function computeEstado(saldo: number, totalAmount: number): CollectionEstado {
  if (saldo === 0) return "PAGADA";
  if (saldo < 0) return "A_FAVOR";
  if (saldo === totalAmount) return "PENDIENTE";
  return "PARCIAL";
}

export const ESTADO_LABEL: Record<CollectionEstado, string> = {
  PAGADA: "Pagada",
  PENDIENTE: "Pendiente",
  PARCIAL: "Parcial",
  A_FAVOR: "A favor",
};

export const PAYMENT_METHODS = ["Transferencia", "Efectivo", "Débito", "Crédito", "Cheque", "Otro"];

export type CollectionCheck = {
  label: string;
  amount: number;
  numero?: string;
  banco?: string;
};

/** `CollectionPayment.checks` is a Prisma Json field, so it comes back as `unknown` at runtime — parse it defensively rather than trusting the stored shape. */
export function parseChecks(value: unknown): CollectionCheck[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (c): c is Record<string, unknown> =>
        typeof c === "object" &&
        c !== null &&
        typeof (c as Record<string, unknown>).label === "string" &&
        typeof (c as Record<string, unknown>).amount === "number",
    )
    .map((c) => ({
      label: c.label as string,
      amount: c.amount as number,
      numero: typeof c.numero === "string" && c.numero ? c.numero : undefined,
      banco: typeof c.banco === "string" && c.banco ? c.banco : undefined,
    }));
}

/** One-line label for a cheque, used in the payments history and on printed receipts. */
export function formatCheckLabel(c: CollectionCheck): string {
  const details = [c.numero && `N° ${c.numero}`, c.banco].filter(Boolean).join(" · ");
  return details ? `${c.label} (${details})` : c.label;
}

export type CollectionPaymentKind = "ABONO" | "ACUERDO" | "NOTA_CREDITO";

export const PAYMENT_KIND_LABEL: Record<CollectionPaymentKind, string> = {
  ABONO: "Abono",
  ACUERDO: "Acuerdo comercial",
  NOTA_CREDITO: "Nota de crédito",
};

export type CollectionCreditItem = {
  modelo: string;
  cantidad: number;
  valorUnitario: number;
};

/** `CollectionPayment.creditItems` is a Prisma Json field, so it comes back as `unknown` at runtime — parse it defensively rather than trusting the stored shape. */
export function parseCreditItems(value: unknown): CollectionCreditItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (it): it is Record<string, unknown> =>
        typeof it === "object" &&
        it !== null &&
        typeof (it as Record<string, unknown>).modelo === "string" &&
        typeof (it as Record<string, unknown>).cantidad === "number" &&
        typeof (it as Record<string, unknown>).valorUnitario === "number",
    )
    .map((it) => ({
      modelo: it.modelo as string,
      cantidad: it.cantidad as number,
      valorUnitario: it.valorUnitario as number,
    }));
}

// Same rate used for sales (see IVA_RATE in sale-form.tsx/server/actions/sales.ts).
export const CREDIT_NOTE_IVA_RATE = 0.19;

/**
 * The values entered per model (cantidad, valorUnitario) are net-of-tax,
 * same as a sale line — `bruto` is their raw sum, IVA is computed on top of
 * it, and `total` (bruto + iva) is what actually gets deducted from the
 * document's Monto Total/saldo (stored as the payment's `amount`).
 */
export function computeCreditNoteTotals(items: { cantidad: number; valorUnitario: number }[]) {
  const bruto = items.reduce((s, it) => s + it.cantidad * it.valorUnitario, 0);
  const iva = Math.round(bruto * CREDIT_NOTE_IVA_RATE);
  return { bruto, iva, total: bruto + iva };
}
