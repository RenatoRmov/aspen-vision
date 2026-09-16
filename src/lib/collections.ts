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
