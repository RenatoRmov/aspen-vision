/** Pure helpers for the Clientes/Hoy CRM — no DB/server dependency so both server queries and client forms can share the same rules. */

import { differenceInCalendarDays } from "date-fns";

/**
 * CustomerActivity.date/.nextActionDate and Collection.documentDate are all
 * "pure calendar dates" stored at UTC midnight (same convention as
 * formatDateOnly in src/lib/format.ts) — comparing them against "today" or
 * adding days must stay in UTC too, or the result silently shifts by a day
 * depending on the server process's local timezone offset. Sale.date is a
 * real timestamp, not one of these, so differenceInCalendarDays (local time)
 * is the right tool for it — see computeClientEstado below.
 */
export function utcStartOfToday(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function utcDayDiff(a: Date, b: Date): number {
  const MS_PER_DAY = 86_400_000;
  const utcA = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const utcB = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((utcA - utcB) / MS_PER_DAY);
}

/** Monday-to-Sunday week containing `now`, in UTC — for filtering
 * nextActionDate (which the "visitar esta semana" quick filter compares
 * against) without the same local/UTC drift risk. */
export function utcWeekRange(now: Date = new Date()): { start: Date; end: Date } {
  const MS_PER_DAY = 86_400_000;
  const start = utcStartOfToday(now);
  const dow = start.getUTCDay(); // 0 = Sunday .. 6 = Saturday
  const diffToMonday = dow === 0 ? 6 : dow - 1;
  const monday = new Date(start.getTime() - diffToMonday * MS_PER_DAY);
  const sunday = new Date(monday.getTime() + 7 * MS_PER_DAY - 1);
  return { start: monday, end: sunday };
}

export type ClientEstado = "ACTIVO" | "SEGUIMIENTO" | "EN_RIESGO" | "NUEVO";

/**
 * Activo = compró hace menos de 30 días; Seguimiento = entre 30 y 60 días;
 * En riesgo = más de 60 días sin comprar; Nuevo = nunca ha comprado (cliente
 * cargado a mano, o cuya única venta fue editada para quitarle el cliente).
 */
export function computeClientEstado(lastSaleDate: Date | null, now: Date = new Date()): ClientEstado {
  if (!lastSaleDate) return "NUEVO";
  const days = differenceInCalendarDays(now, lastSaleDate);
  if (days < 30) return "ACTIVO";
  if (days <= 60) return "SEGUIMIENTO";
  return "EN_RIESGO";
}

export const ESTADO_LABEL: Record<ClientEstado, string> = {
  ACTIVO: "Activo",
  SEGUIMIENTO: "Seguimiento",
  EN_RIESGO: "En riesgo",
  NUEVO: "Nuevo",
};

/** Tailwind classes for the colored status dot — mirrors CollectionEstadoBadge's approach. */
export const ESTADO_DOT_COLOR: Record<ClientEstado, string> = {
  ACTIVO: "bg-status-good",
  SEGUIMIENTO: "bg-status-warning",
  EN_RIESGO: "bg-status-critical",
  NUEVO: "bg-muted-foreground",
};

/**
 * Collection has no due-date field, only documentDate — a "vencimiento" is
 * only ever computed, never guessed. Returns null when the term isn't known,
 * which callers must render as "no vencimiento" rather than assuming 30 days.
 */
export function computeDueDate(documentDate: Date, paymentTermsDays: number | null | undefined): Date | null {
  if (paymentTermsDays == null) return null;
  const d = documentDate;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + paymentTermsDays));
}

export type CustomerActivityType = "VISITA" | "LLAMADA" | "WHATSAPP";
export type CustomerActivityStatus = "PENDIENTE" | "COMPLETADA";

export const ACTIVITY_TYPE_LABEL: Record<CustomerActivityType, string> = {
  VISITA: "Visita",
  LLAMADA: "Llamada",
  WHATSAPP: "WhatsApp",
};

export const ACTIVITY_STATUS_LABEL: Record<CustomerActivityStatus, string> = {
  PENDIENTE: "Pendiente",
  COMPLETADA: "Completada",
};

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "12 de octubre" — month/day only, no year (birthdays recur every year). */
export function formatBirthday(month: number | null | undefined, day: number | null | undefined): string | null {
  if (!month || !day) return null;
  return `${day} de ${MONTHS[month - 1]}`;
}

export function isBirthdayToday(
  month: number | null | undefined,
  day: number | null | undefined,
  now: Date = new Date(),
): boolean {
  return month === now.getMonth() + 1 && day === now.getDate();
}
