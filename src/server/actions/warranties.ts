"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { recordInventoryMovement, nextSequentialCode } from "@/server/inventory";

const warrantySchema = z.object({
  customerName: z.string().trim().min(1, "El cliente es obligatorio"),
  customerContact: z.string().trim().optional(),
  productId: z.string().min(1, "Selecciona un producto"),
  quantity: z.coerce.number().int().min(1),
  reason: z.string().trim().min(1, "Indica el motivo"),
  notes: z.string().trim().optional(),
  responsibleId: z.string().optional(),
});

export async function createWarranty(input: z.infer<typeof warrantySchema>) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  if (!can(session.user.role, "warranties:manage")) {
    throw new Error("No tienes permisos para registrar garantías");
  }

  const data = warrantySchema.parse(input);

  const warrantyId = await db.$transaction(async (tx) => {
    const code = await nextSequentialCode(tx, "warranty", "G");
    const warranty = await tx.warranty.create({
      data: {
        code,
        customerName: data.customerName,
        customerContact: data.customerContact || null,
        productId: data.productId,
        quantity: data.quantity,
        reason: data.reason,
        notes: data.notes || null,
        responsibleId: data.responsibleId || session.user.id,
        inventoryApplied: true,
      },
    });

    await recordInventoryMovement(tx, {
      productId: data.productId,
      type: "GARANTIA",
      quantity: -data.quantity,
      reference: `Garantía ${warranty.code}`,
      reason: data.reason,
      warrantyId: warranty.id,
      userId: session.user.id,
    });

    return warranty.id;
  });

  revalidatePath("/garantias");
  return warrantyId;
}

export async function updateWarrantyStatus(
  warrantyId: string,
  status: "PENDIENTE" | "RESUELTA" | "RECHAZADA",
) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  if (!can(session.user.role, "warranties:manage")) {
    throw new Error("No tienes permisos para actualizar garantías");
  }

  await db.warranty.update({ where: { id: warrantyId }, data: { status } });
  revalidatePath("/garantias");
}

/**
 * A warranty always discounts stock immediately at creation (see
 * createWarranty), so deleting one — e.g. a duplicate or test entry — must
 * give that stock back first via an AJUSTE, or the product would stay
 * permanently short with no trace of why.
 */
export async function deleteWarranty(warrantyId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  if (!can(session.user.role, "warranties:delete")) {
    throw new Error("No tienes permisos para eliminar garantías");
  }

  await db.$transaction(async (tx) => {
    const warranty = await tx.warranty.findUniqueOrThrow({ where: { id: warrantyId } });

    if (warranty.inventoryApplied) {
      await recordInventoryMovement(tx, {
        productId: warranty.productId,
        type: "AJUSTE",
        quantity: warranty.quantity,
        reason: `Reverso por eliminación de ${warranty.code}`,
        reference: `Eliminación ${warranty.code}`,
        userId: session.user.id,
      });
    }

    await tx.warranty.delete({ where: { id: warrantyId } });
  });

  revalidatePath("/garantias");
}
