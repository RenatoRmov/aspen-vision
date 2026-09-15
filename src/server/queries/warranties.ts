import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export type WarrantyFilters = {
  status?: "all" | "PENDIENTE" | "RESUELTA" | "RECHAZADA";
  q?: string;
};

export async function getWarranties(filters: WarrantyFilters) {
  const where: Prisma.WarrantyWhereInput = {};
  if (filters.status && filters.status !== "all") where.status = filters.status;
  if (filters.q) {
    where.OR = [
      { code: { contains: filters.q } },
      { customerName: { contains: filters.q } },
      { product: { is: { brand: { contains: filters.q } } } },
      { product: { is: { model: { contains: filters.q } } } },
    ];
  }

  return db.warranty.findMany({
    where,
    orderBy: { date: "desc" },
    include: { product: true, responsible: true },
  });
}
