import "server-only";
import { format } from "date-fns";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { computeSaldo, computeEstado, type CollectionEstado } from "@/lib/collections";
import { normalizeRut } from "@/lib/rut";

function withDerived<T extends { totalAmount: number; payments: { amount: number; kind: string }[] }>(
  c: T,
) {
  const totalPaid = c.payments
    .filter((p) => p.kind === "ABONO")
    .reduce((s, p) => s + p.amount, 0);
  // Returned merchandise (Nota de Crédito) lowers what the client actually
  // owes on this document, same idea as an abono but it isn't money — so it
  // reduces the *effective* total the saldo/estado math is based on, while
  // `totalAmount` itself stays the original invoiced amount.
  const totalCreditNotes = c.payments
    .filter((p) => p.kind === "NOTA_CREDITO")
    .reduce((s, p) => s + p.amount, 0);
  const effectiveTotal = c.totalAmount - totalCreditNotes;
  const saldo = computeSaldo(effectiveTotal, totalPaid);
  return {
    ...c,
    totalPaid,
    totalCreditNotes,
    saldo,
    estado: computeEstado(saldo, effectiveTotal),
  };
}

export type CollectionFilters = {
  estado?: CollectionEstado | "all";
  clientRut?: string;
  folio?: string;
  from?: string; // yyyy-mm-dd
  to?: string; // yyyy-mm-dd
};

function buildWhere(filters: CollectionFilters): Prisma.CollectionWhereInput {
  const where: Prisma.CollectionWhereInput = {};
  if (filters.clientRut) where.clientRut = { contains: normalizeRut(filters.clientRut) };
  if (filters.folio) where.folio = { contains: filters.folio.trim() };
  if (filters.from || filters.to) {
    where.documentDate = {
      ...(filters.from ? { gte: new Date(`${filters.from}T00:00:00.000Z`) } : {}),
      ...(filters.to ? { lte: new Date(`${filters.to}T23:59:59.999Z`) } : {}),
    };
  }
  return where;
}

export async function getCollections(filters: CollectionFilters = {}) {
  // estado/saldo are derived from payments at read time (never stored), so
  // they can't be filtered in the DB query — narrow by the stored columns
  // first, then filter by estado in JS after computing it below.
  const rows = await db.collection.findMany({
    where: buildWhere(filters),
    orderBy: { documentDate: "asc" },
    include: { payments: { select: { amount: true, kind: true } } },
  });
  const withEstado = rows.map(withDerived);

  if (filters.estado && filters.estado !== "all") {
    return withEstado.filter((c) => c.estado === filters.estado);
  }
  return withEstado;
}

/** Aggregates for the standalone "Información Cobranzas" dashboard. Accepts
 * the same Fecha/Rut/Estado filters as the Cobranzas list (no Folio — an
 * aggregate view doesn't make sense narrowed to one document). */
export async function getCollectionsInfo(filters: CollectionFilters = {}) {
  const rows = await db.collection.findMany({
    where: buildWhere(filters),
    include: { payments: { select: { amount: true, date: true, kind: true } } },
  });
  let withEstado = rows.map(withDerived);
  if (filters.estado && filters.estado !== "all") {
    withEstado = withEstado.filter((c) => c.estado === filters.estado);
  }

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

  // Last 6 months of abonos received (real money only), oldest first.
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: format(d, "yyyy-MM"), label: format(d, "MMM yyyy") });
  }
  const collectedByMonth = new Map(months.map((m) => [m.key, 0]));
  for (const c of withEstado) {
    for (const p of c.payments) {
      if (p.kind !== "ABONO") continue;
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
