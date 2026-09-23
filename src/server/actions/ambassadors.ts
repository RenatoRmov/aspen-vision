"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { recordInventoryMovement, nextSequentialCode } from "@/server/inventory";

const ambassadorSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  instagram: z.string().trim().optional(),
  tiktok: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export async function createAmbassador(input: z.infer<typeof ambassadorSchema>) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  if (!can(session.user.role, "ambassadors:manage")) {
    throw new Error("No tienes permisos para gestionar embajadores");
  }

  const data = ambassadorSchema.parse(input);
  const ambassador = await db.ambassador.create({ data });
  revalidatePath("/embajadores");
  return ambassador.id;
}

const deliverySchema = z.object({
  ambassadorId: z.string().min(1),
  items: z
    .array(z.object({ productId: z.string().min(1), quantity: z.coerce.number().int().min(1) }))
    .min(1, "Agrega al menos un producto"),
  notes: z.string().trim().optional(),
});

export async function createAmbassadorDelivery(input: z.infer<typeof deliverySchema>) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  if (!can(session.user.role, "ambassadors:manage")) {
    throw new Error("No tienes permisos para registrar entregas");
  }

  const data = deliverySchema.parse(input);

  const deliveryId = await db.$transaction(async (tx) => {
    const code = await nextSequentialCode(tx, "ambassadorDelivery", "E");
    const delivery = await tx.ambassadorDelivery.create({
      data: {
        code,
        ambassadorId: data.ambassadorId,
        deliveredById: session.user.id,
        notes: data.notes || null,
        items: { create: data.items },
      },
    });

    for (const item of data.items) {
      await recordInventoryMovement(tx, {
        productId: item.productId,
        type: "EMBAJADOR",
        quantity: -item.quantity,
        reference: `Entrega ${delivery.code}`,
        ambassadorDeliveryId: delivery.id,
        userId: session.user.id,
      });
    }

    return delivery.id;
  });

  revalidatePath("/embajadores");
  revalidatePath(`/embajadores/${data.ambassadorId}`);
  return deliveryId;
}

/**
 * Deletes an ambassador along with their full delivery history — there's no
 * separate "delete this one delivery" feature, and AmbassadorDelivery.
 * ambassadorId is RESTRICT, so the deliveries have to go for the ambassador
 * to go. Every delivered unit is given back to stock first via an AJUSTE,
 * same as deleteWarranty/deleteSale, so removing an ambassador never leaves
 * inventory silently short.
 */
export async function deleteAmbassador(ambassadorId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  if (!can(session.user.role, "ambassadors:delete")) {
    throw new Error("No tienes permisos para eliminar embajadores");
  }

  await db.$transaction(async (tx) => {
    const deliveries = await tx.ambassadorDelivery.findMany({
      where: { ambassadorId },
      include: { items: true },
    });

    for (const delivery of deliveries) {
      for (const item of delivery.items) {
        await recordInventoryMovement(tx, {
          productId: item.productId,
          type: "AJUSTE",
          quantity: item.quantity,
          reason: `Reverso por eliminación de embajador (entrega ${delivery.code})`,
          reference: "Eliminación de embajador",
          userId: session.user.id,
        });
      }
    }

    await tx.ambassadorDelivery.deleteMany({ where: { ambassadorId } });
    await tx.ambassador.delete({ where: { id: ambassadorId } });
  });

  revalidatePath("/embajadores");
}
