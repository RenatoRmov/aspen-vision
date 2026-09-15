/** Utilities for Chilean RUT (tax id) handling: normalize, format, validate. */

export function normalizeRut(rut: string): string {
  return rut.replace(/[.\s]/g, "").toUpperCase();
}

/**
 * Canonical storage form: digits + dash + check digit, no dots. Using this
 * consistently as the DB key means a RUT matches regardless of how the user
 * typed it (with dots, without a dash yet while typing, lowercase k, etc).
 */
export function canonicalRut(rut: string): string {
  const clean = normalizeRut(rut).replace(/-/g, "");
  if (clean.length < 2) return clean;
  return `${clean.slice(0, -1)}-${clean.slice(-1)}`;
}

export function formatRut(rut: string): string {
  const clean = normalizeRut(rut).replace(/-/g, "");
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots}-${dv}`;
}

export function isValidRut(rut: string): boolean {
  const clean = normalizeRut(rut).replace(/-/g, "");
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);

  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  return dv === expected;
}
