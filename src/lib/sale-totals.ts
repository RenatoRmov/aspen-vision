export const IVA_RATE = 0.19;

/**
 * Chile's IVA is computed once on a sale's net subtotal, never accumulated
 * from independently-rounded per-line amounts — summing per-line roundings
 * across many items drifts a few pesos from a plain 19% check on the total,
 * which is exactly the kind of thing a customer manually verifies.
 */
export function taxOf(subtotal: number): number {
  return Math.round(subtotal * IVA_RATE);
}

export function withTax(subtotal: number): number {
  return subtotal + taxOf(subtotal);
}
