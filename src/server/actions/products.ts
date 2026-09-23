"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { recordInventoryMovement } from "@/server/inventory";

const productSchema = z.object({
  name: z.string().min(1, "El nombre del producto es obligatorio").trim(),
  barcode: z.string().min(3, "El código de barras es muy corto").trim(),
  brand: z.string().min(1, "La marca es obligatoria").trim(),
  model: z.string().min(1, "El modelo es obligatorio").trim(),
  categoryId: z.string().min(1, "Selecciona una categoría"),
  shape: z.string().trim().optional(),
  color: z.string().trim().optional(),
  material: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  images: z.array(z.string()).default([]),
});

async function requireInventoryManager() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  if (!can(session.user.role, "inventory:manage")) {
    throw new Error("No tienes permisos para gestionar el inventario");
  }
  return session.user;
}

export async function createProduct(input: z.infer<typeof productSchema>, initialStock: number) {
  const user = await requireInventoryManager();
  const data = productSchema.parse(input);
  const stock = Math.max(0, Math.trunc(initialStock) || 0);

  const existing = await db.product.findUnique({ where: { barcode: data.barcode } });
  if (existing) {
    throw new Error("Ya existe un producto con ese código de barras.");
  }

  const product = await db.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: { ...data, stock: 0 },
    });

    if (stock > 0) {
      await recordInventoryMovement(tx, {
        productId: created.id,
        type: "ENTRADA",
        quantity: stock,
        reason: "Stock inicial al crear el producto",
        reference: "Alta de producto",
        userId: user.id,
      });
    }

    return created;
  });

  revalidatePath("/inventario");
  return product.id;
}

export async function updateProduct(
  productId: string,
  input: z.infer<typeof productSchema>,
) {
  await requireInventoryManager();
  const data = productSchema.parse(input);

  const existing = await db.product.findFirst({
    where: { barcode: data.barcode, NOT: { id: productId } },
  });
  if (existing) {
    throw new Error("Ya existe otro producto con ese código de barras.");
  }

  await db.product.update({ where: { id: productId }, data });
  revalidatePath("/inventario");
  revalidatePath(`/inventario/${productId}`);
}

export async function setProductActive(productId: string, active: boolean) {
  await requireInventoryManager();
  await db.product.update({ where: { id: productId }, data: { active } });
  revalidatePath("/inventario");
  revalidatePath(`/inventario/${productId}`);
}

const movementSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().refine((v) => v !== 0, "La cantidad no puede ser 0"),
  reason: z.string().trim().min(1, "Indica un motivo"),
});

export async function registerEntrada(input: z.infer<typeof movementSchema>) {
  const user = await requireInventoryManager();
  const data = movementSchema.parse(input);
  if (data.quantity <= 0) {
    throw new Error("Una entrada debe ser una cantidad positiva.");
  }

  await db.$transaction((tx) =>
    recordInventoryMovement(tx, {
      productId: data.productId,
      type: "ENTRADA",
      quantity: data.quantity,
      reason: data.reason,
      reference: "Entrada manual",
      userId: user.id,
    }),
  );

  revalidatePath("/inventario");
  revalidatePath(`/inventario/${data.productId}`);
}

export async function registerAjuste(input: z.infer<typeof movementSchema>) {
  const user = await requireInventoryManager();
  const data = movementSchema.parse(input);

  await db.$transaction((tx) =>
    recordInventoryMovement(tx, {
      productId: data.productId,
      type: "AJUSTE",
      quantity: data.quantity,
      reason: data.reason,
      reference: "Ajuste manual",
      userId: user.id,
    }),
  );

  revalidatePath("/inventario");
  revalidatePath(`/inventario/${data.productId}`);
}

export type ProductFormValues = z.infer<typeof productSchema>;

const importItemSchema = z.object({
  name: z.string().trim().min(1),
  model: z.string().trim().min(1),
  barcode: z.string().trim().min(1),
  brand: z.string().trim().min(1),
  category: z.string().trim().min(1),
  stock: z.coerce.number().int().min(0),
});

export type ProductImportInput = z.infer<typeof importItemSchema>;

function slugifyCategory(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Bulk product load (e.g. from the SII/stock-format import dialog). Every
 * item is a brand-new product — re-imports skip rows the parser already
 * flagged as existing — so stock is written directly at creation instead of
 * going through `recordInventoryMovement` row by row: with no prior ledger
 * to reconcile against, a single ENTRADA per product afterwards produces the
 * exact same end state, without one DB round trip per row.
 */
export async function createProductsBulk(items: ProductImportInput[]) {
  const user = await requireInventoryManager();
  const data = items.map((item) => importItemSchema.parse(item));
  if (data.length === 0) return 0;

  const categoryNames = [...new Set(data.map((d) => d.category))];
  const existingCategories = await db.category.findMany({
    where: { name: { in: categoryNames } },
  });
  const categoryIdByName = new Map(existingCategories.map((c) => [c.name, c.id]));

  const missingCategories = categoryNames.filter((name) => !categoryIdByName.has(name));
  if (missingCategories.length > 0) {
    await db.category.createMany({
      data: missingCategories.map((name) => ({ name, slug: slugifyCategory(name) })),
      skipDuplicates: true,
    });
    const created = await db.category.findMany({ where: { name: { in: missingCategories } } });
    for (const c of created) categoryIdByName.set(c.name, c.id);
  }

  // Defensive re-check: the parser already excluded barcodes that existed at
  // parse time, but a second guard here avoids a unique-constraint failure
  // if something else was imported in between.
  const barcodes = data.map((d) => d.barcode);
  const alreadyExisting = await db.product.findMany({
    where: { barcode: { in: barcodes } },
    select: { barcode: true },
  });
  const existingBarcodes = new Set(alreadyExisting.map((p) => p.barcode));
  const toCreate = data.filter((d) => !existingBarcodes.has(d.barcode));
  if (toCreate.length === 0) return 0;

  await db.product.createMany({
    data: toCreate.map((d) => ({
      name: d.name,
      barcode: d.barcode,
      brand: d.brand,
      model: d.model,
      categoryId: categoryIdByName.get(d.category)!,
      stock: d.stock,
    })),
  });

  const created = await db.product.findMany({
    where: { barcode: { in: toCreate.map((d) => d.barcode) } },
    select: { id: true, barcode: true },
  });
  const productIdByBarcode = new Map(created.map((p) => [p.barcode, p.id]));

  const movements = toCreate
    .filter((d) => d.stock > 0)
    .map((d) => ({
      productId: productIdByBarcode.get(d.barcode)!,
      type: "ENTRADA" as const,
      quantity: d.stock,
      reason: "Stock inicial de carga masiva",
      reference: "Importación de inventario",
      userId: user.id,
    }));
  if (movements.length > 0) {
    await db.inventoryMovement.createMany({ data: movements });
  }

  revalidatePath("/inventario");
  return toCreate.length;
}
