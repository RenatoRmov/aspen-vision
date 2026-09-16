import "server-only";
import { format } from "date-fns";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { computeSaldo, computeEstado, type CollectionEstado } from "@/lib/collections";
import { normalizeRut } from "@/lib/rut";

function withDerived<T extends { totalAmount: number; payments: { amount: number }[] }>(
  c: T,
) {
  const totalPaid = c.payments.reduce((s, p) => s + p.amount, 0);
  const saldo = computeSaldo(c.totalAmount, totalPaid);
  return { ...c, totalPaid, saldo, estado: computeEstado(saldo, c.totalAmount) };
}

export type CollectionFilters = {
  estado?: CollectionEstado | "all";
  clientRut?: string;
  folio?: string;
  from?: string; // yyyy-mm-dd
  to?: string; // yyyy-mm-dd
};

export async function getCollections(filters: CollectionFilters = {}) {
  // estado/saldo are derived from payments at read time (never stored), so
  // they can't be filtered in the DB query — narrow by the stored columns
  // first, then filter by estado in JS after computing it below.
  const where: Prisma.CollectionWhereInput = {};
  if (filters.clientRut) where.clientRut = { contains: normalizeRut(filters.clientRut) };
  if (filters.folio) where.folio = { contains: filters.folio.trim() };
  if (filters.from || filters.to) {
    where.documentDate = {
      ...(filters.from ? { gte: new Date(`${filters.from}T00:00:00.000Z`) } : {}),
      ...(filters.to ? { lte: new Date(`${filters.to}T23:59:59.999Z`) } : {}),
    };
  }

  const rows = await db.collection.findMany({
    where,
    orderBy: { documentDate: "asc" },
    include: { payments: { select: { amount: true } } },
  });
  const withEstado = rows.map(withDerived);

  if (filters.estado && filters.estado !== "all") {
    return withEstado.filter((c) => c.estado === filters.estado);
  }
  return withEstado;
}

/** Aggregates for the standalone "Información Cobranzas" dashboard — always
 * the full dataset (no filters), since this is a point-in-time snapshot of
 * who owes what, not a period-bound report like Resumen's sales figures. */
export async function getCollectionsInfo() {
  const rows = await db.collection.findMany({
    include: { payments: { select: { amount: true, date: true } } },
  });
  const withEstado = rows.map(withDerived);

  const totalDocuments = withEstado.length;
  const totalInvoiced = withEstado.reduce((s, c) => s + c.totalAmount, 0);
  const totalCollected = withEstado.reduce((s, c) => s + c.totalPaid, 0);
  const totalPending = withEstado.reduce((s, c) => s + (c.saldo > 0 ? c.saldo : 0), 0);

  const countByEstado: Record<CollectionEstado, number> = {
    PAGADA: 0,
    PENDIENTE: 0,
    PARCIAL: 0,
    A_FAVOR: 0,
  };
  for (const c of withEstado) countByEstado[c.estado]++;

  const debtorTotals = new Map<
    string,
    { rut: string; name: string; saldo: number; documentos: number }
  >();
  for (const c of withEstado) {
    if (c.saldo <= 0) continue;
    const entry = debtorTotals.get(c.clientRut) ?? {
      rut: c.clientRut,
      name: c.businessName,
      saldo: 0,
      documentos: 0,
    };
    entry.saldo += c.saldo;
    entry.documentos += 1;
    debtorTotals.set(c.clientRut, entry);
  }
  const topDebtors = [...debtorTotals.values()]
    .sort((a, b) => b.saldo - a.saldo)
    .slice(0, 10);

  // Last 6 months of abonos received, oldest first.
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: format(d, "yyyy-MM"), label: format(d, "MMM yyyy") });
  }
  const collectedByMonth = new Map(months.map((m) => [m.key, 0]));
  for (const c of withEstado) {
    for (const p of c.payments) {
      const key = format(new Date(p.date), "yyyy-MM");
      if (collectedByMonth.has(key)) {
        collectedByMonth.set(key, collectedByMonth.get(key)! + p.amount);
      }
    }
  }
  const collectionsTrend = months.map((m) => ({
    label: m.label,
    amount: collectedByMonth.get(m.key) ?? 0,
  }));

  return {
    totalDocuments,
    totalInvoiced,
    totalCollected,
    totalPending,
    countByEstado,
    topDebtors,
    collectionsTrend,
  };
}

export async function getCollectionById(id: string) {
  const c = await db.collection.findUnique({
    where: { id },
    include: { payments: { orderBy: { date: "desc" }, include: { createdBy: true } } },
  });
  if (!c) return null;
  return withDerived(c);
}
