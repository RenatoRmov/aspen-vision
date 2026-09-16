import "server-only";
import { db } from "@/lib/db";
import { computeSaldo, computeEstado } from "@/lib/collections";

function withDerived<T extends { totalAmount: number; payments: { amount: number }[] }>(
  c: T,
) {
  const totalPaid = c.payments.reduce((s, p) => s + p.amount, 0);
  const saldo = computeSaldo(c.totalAmount, totalPaid);
  return { ...c, totalPaid, saldo, estado: computeEstado(saldo, c.totalAmount) };
}

export async function getCollections() {
  const rows = await db.collection.findMany({
    orderBy: { documentDate: "asc" },
    include: { payments: { select: { amount: true } } },
  });
  return rows.map(withDerived);
}

export async function getCollectionById(id: string) {
  const c = await db.collection.findUnique({
    where: { id },
    include: { payments: { orderBy: { date: "desc" }, include: { createdBy: true } } },
  });
  if (!c) return null;
  return withDerived(c);
}
