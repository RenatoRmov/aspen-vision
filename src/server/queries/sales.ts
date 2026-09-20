import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export type SaleFilters = {
  status?: "all" | "pending" | "confirmed";
  sellerId?: string; // restrict to a single seller (used for VENDEDOR role)
  customerId?: string; // restrict to a single customer (used by the Clientes detail page)
  q?: string;
};

export async function getSales(filters: SaleFilters) {
  const where: Prisma.SaleWhereInput = {};

  if (filters.status === "pending") where.status = "PENDIENTE_CONFIRMACION";
  else if (filters.status === "confirmed") where.status = "CONFIRMADA";

  if (filters.sellerId) where.sellerId = filters.sellerId;
  if (filters.customerId) where.customerId = filters.customerId;

  if (filters.q) {
    where.OR = [
      { code: { contains: filters.q } },
      { customer: { is: { name: { contains: filters.q } } } },
      { seller: { name: { contains: filters.q } } },
    ];
  }

  return db.sale.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      seller: true,
      customer: true,
      items: { include: { product: true }, orderBy: { position: "asc" } },
    },
    take: 200,
  });
}

export async function getSaleById(id: string) {
  return db.sale.findUnique({
    where: { id },
    include: {
      seller: true,
      confirmedBy: true,
      customer: true,
      items: { include: { product: true }, orderBy: { position: "asc" } },
    },
  });
}

export async function getSellers() {
  return db.user.findMany({
    where: { active: true, role: { in: ["VENDEDOR", "ADMIN", "PREPARADOR"] } },
    orderBy: { name: "asc" },
  });
}
