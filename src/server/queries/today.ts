import "server-only";
import { differenceInCalendarDays } from "date-fns";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";
import { can } from "@/lib/permissions";
import { canonicalRut } from "@/lib/rut";
import { computeSaldo } from "@/lib/collections";
import { computeClientEstado, computeDueDate, isBirthdayToday, utcStartOfToday } from "@/lib/customers";

/** Everything the "Hoy" dashboard needs, scoped to a single seller unless
 * the viewer has customers:view-all (mirrors sales:view-all exactly). */
export async function getTodayData(userId: string, role: Role) {
  const canViewAll = can(role, "customers:view-all");
  const now = new Date();
  // nextActionDate is a UTC-midnight pure calendar date — compare against a
  // UTC-anchored "today" window, not local-time startOfDay/endOfDay, or this
  // silently misses "today" whenever the server's local offset is negative.
  const todayStart = utcStartOfToday(now);
  const todayEnd = new Date(todayStart.getTime() + 86_400_000 - 1);

  const customers = await db.customer.findMany({
    where: canViewAll ? {} : { assignedSellerId: userId },
    include: {
      sales: { where: { cancelledAt: null }, select: { date: true, items: { select: { total: true } } } },
      activities: true,
    },
  });

  const collections = await db.collection.findMany({
    select: {
      id: true,
      folio: true,
      clientRut: true,
      documentDate: true,
      totalAmount: true,
      payments: { select: { amount: true, kind: true } },
    },
  });

  const scopedRuts = new Set(customers.map((c) => canonicalRut(c.rut)));
  const termsByRut = new Map(customers.map((c) => [canonicalRut(c.rut), c.paymentTermsDays]));
  const debtByRut = new Map<string, number>();
  const dueDatesByRut = new Map<string, Date[]>();
  for (const c of collections) {
    const rut = canonicalRut(c.clientRut);
    if (!scopedRuts.has(rut)) continue;
    const totalPaid = c.payments.filter((p) => p.kind === "ABONO").reduce((s, p) => s + p.amount, 0);
    const totalCreditNotes = c.payments
      .filter((p) => p.kind === "NOTA_CREDITO")
      .reduce((s, p) => s + p.amount, 0);
    const saldo = computeSaldo(c.totalAmount - totalCreditNotes, totalPaid);
    if (saldo <= 0) continue;
    debtByRut.set(rut, (debtByRut.get(rut) ?? 0) + saldo);
    const dueDate = computeDueDate(c.documentDate, termsByRut.get(rut));
    if (dueDate) {
      const dates = dueDatesByRut.get(rut) ?? [];
      dates.push(dueDate);
      dueDatesByRut.set(rut, dates);
    }
  }

  const enriched = customers.map((c) => {
    const sortedSales = [...c.sales].sort((a, b) => b.date.getTime() - a.date.getTime());
    const lastSale = sortedSales[0] ?? null;
    const lastSaleDate = lastSale?.date ?? null;
    const lastSaleAmount = lastSale ? lastSale.items.reduce((s, i) => s + i.total, 0) : 0;
    const estado = computeClientEstado(lastSaleDate, now);
    const daysSinceLastSale = lastSaleDate ? differenceInCalendarDays(now, lastSaleDate) : null;
    const rut = canonicalRut(c.rut);
    const deuda = debtByRut.get(rut) ?? 0;
    const soonestDueDate = dueDatesByRut.get(rut)?.sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
    const pendingActivities = c.activities.filter(
      (a): a is typeof a & { nextActionDate: Date } => a.status === "PENDIENTE" && a.nextActionDate !== null,
    );
    return { customer: c, lastSaleDate, lastSaleAmount, daysSinceLastSale, estado, deuda, soonestDueDate, pendingActivities };
  });

  const contactarHoy = enriched
    .map((e) => {
      const dueToday = e.pendingActivities
        .filter((a) => a.nextActionDate >= todayStart && a.nextActionDate <= todayEnd)
        .sort((a, b) => a.nextActionDate.getTime() - b.nextActionDate.getTime())[0];
      return dueToday
        ? {
            customer: e.customer,
            estado: e.estado,
            lastSaleDate: e.lastSaleDate,
            lastSaleAmount: e.lastSaleAmount,
            activity: dueToday,
          }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const enRiesgoAll = enriched.filter((e) => e.estado === "EN_RIESGO");
  const enRiesgo = [...enRiesgoAll]
    .sort((a, b) => (b.daysSinceLastSale ?? 0) - (a.daysSinceLastSale ?? 0))
    .slice(0, 10);

  const conSeguimientoCount = enriched.filter((e) => e.estado === "SEGUIMIENTO").length;

  const conCobranzaAll = enriched.filter((e) => e.deuda > 0);
  const conCobranza = [...conCobranzaAll]
    .sort((a, b) => (a.soonestDueDate?.getTime() ?? Infinity) - (b.soonestDueDate?.getTime() ?? Infinity))
    .slice(0, 10);

  const cumpleanosHoy = enriched.filter((e) =>
    isBirthdayToday(e.customer.birthdayMonth, e.customer.birthdayDay, now),
  );

  const proximasAcciones = enriched
    .flatMap((e) => e.pendingActivities.map((a) => ({ customer: e.customer, activity: a })))
    .sort((a, b) => a.activity.nextActionDate.getTime() - b.activity.nextActionDate.getTime())
    .slice(0, 15);

  return {
    contactarHoy,
    contactarHoyCount: contactarHoy.length,
    enRiesgo,
    enRiesgoCount: enRiesgoAll.length,
    conSeguimientoCount,
    conCobranza,
    conCobranzaCount: conCobranzaAll.length,
    cumpleanosHoy,
    proximasAcciones,
  };
}
