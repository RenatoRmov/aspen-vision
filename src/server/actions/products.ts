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
