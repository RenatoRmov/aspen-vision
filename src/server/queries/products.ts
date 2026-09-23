import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";

export type ProductFilters = {
  q?: string;
  categorySlug?: string;
  availability?: "all" | "in-stock" | "low-stock" | "out-of-stock";
  status?: "active" | "inactive" | "all";
  sort?: "recent" | "name" | "model" | "stock-asc" | "stock-desc";
};

// Model codes mix digits and letters ("6095 AEV54", "OR00065701B", "31072 C3"),
// so a plain string sort would put "17121…" before "6095…" (compares the
// leading "1" against "6"). A natural/numeric collator compares embedded
// digit runs as numbers instead, which is what keeps every 6xxx model
// together, then every 7xxx, etc.
const naturalCollator = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

export async function getProducts(filters: ProductFilters) {
  const where: Prisma.ProductWhereInput = {};

  if (filters.status === "inactive") where.active = false;
  else if (filters.status !== "all") where.active = true;

  if (filters.categorySlug) {
    where.category = { slug: filters.categorySlug };
  }

  if (filters.q) {
    where.OR = [
      { barcode: { contains: filters.q } },
      { name: { contains: filters.q } },
      { brand: { contains: filters.q } },
      { model: { contains: filters.q } },
    ];
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput = { updatedAt: "desc" };
  if (filters.sort === "name") orderBy = { name: "asc" };
  if (filters.sort === "stock-asc") orderBy = { stock: "asc" };
  if (filters.sort === "stock-desc") orderBy = { stock: "desc" };
  // "model" sorts in JS below — a natural sort has no SQL equivalent to hand
  // Prisma's orderBy, so the DB order here doesn't matter for that case.

  const products = await db.product.findMany({
    where,
    orderBy,
    include: { category: true },
  });

  if (filters.sort === "model") {
    products.sort((a, b) => naturalCollator.compare(a.model, b.model));
  }

  if (filters.availability === "in-stock") {
    return products.filter((p) => p.stock > 0);
  }
  if (filters.availability === "out-of-stock") {
    return products.filter((p) => p.stock <= 0);
  }
  if (filters.availability === "low-stock") {
    return products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD);
  }
  return products;
}

export async function getCategories() {
  return db.category.findMany({ orderBy: { name: "asc" } });
}

/** Categories with a live product count, for the left-hand browser in Inventario. */
export async function getCategoriesWithCounts() {
  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: { where: { active: true } } } } },
  });
  const totalActive = await db.product.count({ where: { active: true } });
  return { categories, totalActive };
}

export async function getProductWithHistory(id: string) {
  const product = await db.product.findUnique({
    where: { id },
    include: { category: true },
  });
  if (!product) return null;

  const movements = await db.inventoryMovement.findMany({
    where: { productId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: true },
  });

  return { product, movements };
}
