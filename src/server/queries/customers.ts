import "server-only";
import { startOfYear } from "date-fns";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { canonicalRut } from "@/lib/rut";
import { computeSaldo } from "@/lib/collections";
import { getCollections } from "@/server/queries/collections";
import { getSales } from "@/server/queries/sales";
import { computeClientEstado, utcWeekRange, type ClientEstado } from "@/lib/customers";
import { withTax } from "@/lib/sale-totals";

/** One-shot lookup of pending debt per client, keyed by canonical RUT — avoids
 * an N+1 query per customer. `Collection.clientRut` is always canonicalized
 * by every write path (see src/server/actions/collections.ts's `normalize`),
 * same as `Customer.rut`, but we canonicalize again here defensively rather
 * than trusting that invariant blindly. */
async function getDebtByRut(): Promise<Map<string, number>> {
  const collections = await db.collection.findMany({
    select: { clientRut: true, totalAmount: true, payments: { select: { amount: true, kind: true } } },
  });
  const debtByRut = new Map<string, number>();
  for (const c of collections) {
    const rut = canonicalRut(c.clientRut);
    const totalPaid = c.payments.filter((p) => p.kind === "ABONO").reduce((s, p) => s + p.amount, 0);
    const totalCreditNotes = c.payments
      .filter((p) => p.kind === "NOTA_CREDITO")
      .reduce((s, p) => s + p.amount, 0);
    const saldo = computeSaldo(c.totalAmount - totalCreditNotes, totalPaid);
    if (saldo > 0) debtByRut.set(rut, (debtByRut.get(rut) ?? 0) + saldo);
  }
  return debtByRut;
}

export type ClientFilters = {
  assignedSellerId?: string; // undefined = no scoping (canViewAll)
  estado?: ClientEstado | "con-deuda" | "visitar-semana" | "all";
  q?: string;
};

function buildWhere(filters: ClientFilters): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {};
  if (filters.assignedSellerId) where.assignedSellerId = filters.assignedSellerId;
  if (filters.q) {
    const q = filters.q.trim();
    where.OR = [
      { name: { contains: q } },
      { rut: { contains: q } },
      { businessName: { contains: q } },
      { city: { contains: q } },
    ];
  }
  return where;
}

export async function getClients(filters: ClientFilters = {}) {
  const [customers, debtByRut] = await Promise.all([
    db.customer.findMany({
      where: buildWhere(filters),
      orderBy: { name: "asc" },
      include: {
        assignedSeller: { select: { name: true } },
        sales: {
          where: { cancelledAt: null },
          select: { date: true, items: { select: { subtotal: true } } },
        },
        activities: { select: { date: true, nextActionDate: true, status: true } },
      },
    }),
    getDebtByRut(),
  ]);

  const now = new Date();
  // nextActionDate is a UTC-midnight pure calendar date — a UTC-anchored
  // week range keeps this consistent instead of drifting by a day depending
  // on the server process's local timezone offset.
  const { start: weekStart, end: weekEnd } = utcWeekRange(now);
  const yearStart = startOfYear(now);

  const rows = customers.map((c) => {
    const lastSaleDate = c.sales.length
      ? c.sales.reduce((max, s) => (s.date > max ? s.date : max), c.sales[0].date)
      : null;
    const ventaAcumulada = c.sales
      .filter((s) => s.date >= yearStart)
      .reduce((sum, s) => sum + withTax(s.items.reduce((a, i) => a + i.subtotal, 0)), 0);
    const lastVisitDate = c.activities.length
      ? c.activities.reduce((max, a) => (a.date > max ? a.date : max), c.activities[0].date)
      : null;
    const pendingActivities = c.activities.filter(
      (a): a is typeof a & { nextActionDate: Date } => a.status === "PENDIENTE" && a.nextActionDate !== null,
    );
    const proximoContacto = pendingActivities.length
      ? pendingActivities.reduce(
          (min, a) => (a.nextActionDate < min ? a.nextActionDate : min),
          pendingActivities[0].nextActionDate,
        )
      : null;
    const deuda = debtByRut.get(canonicalRut(c.rut)) ?? 0;
    const estado = computeClientEstado(lastSaleDate, now);
    const visitarEstaSemana = pendingActivities.some(
      (a) => a.nextActionDate >= weekStart && a.nextActionDate <= weekEnd,
    );

    return {
      id: c.id,
      name: c.name,
      businessName: c.businessName,
      rut: c.rut,
      city: c.city,
      lastSaleDate,
      lastVisitDate,
      ventaAcumulada,
      proximoContacto,
      deuda,
      assignedSellerName: c.assignedSeller?.name ?? null,
      estado,
      visitarEstaSemana,
    };
  });

  let filtered = rows;
  if (filters.estado === "con-deuda") filtered = rows.filter((r) => r.deuda > 0);
  else if (filters.estado === "visitar-semana") filtered = rows.filter((r) => r.visitarEstaSemana);
  else if (filters.estado && filters.estado !== "all") {
    filtered = rows.filter((r) => r.estado === filters.estado);
  }

  const counts = {
    all: rows.length,
    ACTIVO: rows.filter((r) => r.estado === "ACTIVO").length,
    SEGUIMIENTO: rows.filter((r) => r.estado === "SEGUIMIENTO").length,
    EN_RIESGO: rows.filter((r) => r.estado === "EN_RIESGO").length,
    conDeuda: rows.filter((r) => r.deuda > 0).length,
    visitarSemana: rows.filter((r) => r.visitarEstaSemana).length,
  };

  return { rows: filtered, counts };
}

export async function getClientById(id: string) {
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      assignedSeller: { select: { id: true, name: true } },
      activities: { orderBy: { date: "desc" }, include: { createdBy: { select: { name: true } } } },
    },
  });
  if (!customer) return null;

  const [sales, collections] = await Promise.all([
    getSales({ customerId: id }),
    getCollections({ clientRut: customer.rut }),
  ]);

  const activeSales = sales.filter((s) => !s.cancelledAt);
  const now = new Date();
  const yearStart = startOfYear(now);
  const salesThisYear = activeSales.filter((s) => s.date >= yearStart);

  const lastSaleDate = activeSales.length
    ? activeSales.reduce((max, s) => (s.date > max ? s.date : max), activeSales[0].date)
    : null;
  const estado = computeClientEstado(lastSaleDate, now);

  const ventaAcumuladaAnual = salesThisYear.reduce(
    (sum, s) => sum + withTax(s.items.reduce((a, i) => a + i.subtotal, 0)),
    0,
  );

  // "Resumen de actividad" is all-time (this client may have been buying
  // since long before this system existed), unlike the year-scoped stat above.
  let totalUnidades = 0;
  let totalDiscountPercentSum = 0;
  let totalDiscountLines = 0;
  const brandQty = new Map<string, number>();
  for (const s of activeSales) {
    for (const item of s.items) {
      totalUnidades += item.quantity;
      totalDiscountPercentSum += item.discountPercent;
      totalDiscountLines += 1;
      const brand = item.product.brand;
      brandQty.set(brand, (brandQty.get(brand) ?? 0) + item.quantity);
    }
  }
  const totalRevenueWithTax = activeSales.reduce(
    (sum, s) => sum + withTax(s.items.reduce((a, i) => a + i.subtotal, 0)),
    0,
  );
  const avgDiscountPercent = totalDiscountLines > 0 ? totalDiscountPercentSum / totalDiscountLines : 0;
  const avgTicket = activeSales.length > 0 ? Math.round(totalRevenueWithTax / activeSales.length) : 0;

  const totalBrandQty = [...brandQty.values()].reduce((a, b) => a + b, 0);
  const brands = [...brandQty.entries()]
    .map(([brand, qty]) => ({
      brand,
      qty,
      percent: totalBrandQty > 0 ? Math.round((qty / totalBrandQty) * 100) : 0,
    }))
    .sort((a, b) => b.qty - a.qty);

  const lastVisitDate = customer.activities.length ? customer.activities[0].date : null;
  const deuda = collections.reduce((sum, c) => sum + (c.saldo > 0 ? c.saldo : 0), 0);

  return {
    ...customer,
    estado,
    lastSaleDate,
    lastVisitDate,
    ventaAcumuladaAnual,
    comprasAnual: salesThisYear.length,
    deuda,
    resumenActividad: {
      cantidadVentas: activeSales.length,
      cantidadUnidades: totalUnidades,
      descuentoPromedio: avgDiscountPercent,
      ticketPromedio: avgTicket,
    },
    brands,
    // Full history (including cancelled) for the "Historial de ventas" tab —
    // stats above are computed from activeSales, not this.
    sales,
    collections,
  };
}
