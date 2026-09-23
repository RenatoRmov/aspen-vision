"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { recordInventoryMovement, nextSequentialCode } from "@/server/inventory";
import { canonicalRut } from "@/lib/rut";
import type { Prisma } from "@/generated/prisma/client";

const saleItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().int().min(0),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().trim().optional(),
});

const customerSchema = z.object({
  name: z.string().trim().min(1, "El nombre del comprador es obligatorio"),
  rut: z.string().trim().min(3, "El RUT es obligatorio"),
  businessName: z.string().trim().optional(),
});

const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "Agrega al menos un producto"),
  customer: customerSchema.optional(),
  paymentMethod: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  sellerId: z.string().optional(),
});

export type SaleFormValues = z.infer<typeof saleSchema>;

// IVA is never computed per line — see src/lib/sale-totals.ts. Only the net
// discount/subtotal are line-level facts; the sale's tax is derived once,
// at read time, from the sum of these.
function lineAmounts(quantity: number, unitPrice: number, discountPercent: number) {
  const gross = quantity * unitPrice;
  const discountAmount = Math.round(gross * (discountPercent / 100));
  const subtotal = gross - discountAmount;
  return { discountAmount, subtotal };
}

async function findOrCreateCustomer(
  tx: Prisma.TransactionClient,
  input: z.infer<typeof customerSchema>,
  sellerId: string,
) {
  const rut = canonicalRut(input.rut);
  const existing = await tx.customer.findUnique({ where: { rut } });
  if (existing) {
    const needsUpdate =
      existing.name !== input.name ||
      existing.businessName !== (input.businessName || null) ||
      existing.assignedSellerId === null; // backfill only — never overwrite an existing assignment
    if (needsUpdate) {
      return tx.customer.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          businessName: input.businessName || existing.businessName,
          assignedSellerId: existing.assignedSellerId ?? sellerId,
        },
      });
    }
    return existing;
  }
  return tx.customer.create({
    data: { name: input.name, rut, businessName: input.businessName || null, assignedSellerId: sellerId },
  });
}

export async function createSale(input: SaleFormValues) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  if (!can(session.user.role, "sales:create")) {
    throw new Error("No tienes permisos para registrar ventas");
  }

  const data = saleSchema.parse(input);
  // Enforced again here, not just in the form's step-gating UI — every sale
  // must be tied to an identified customer now.
  if (!data.customer) throw new Error("Selecciona un cliente para registrar la venta");
  const sellerId =
    session.user.role === "ADMIN" && data.sellerId ? data.sellerId : session.user.id;

  const saleId = await db.$transaction(async (tx) => {
    const code = await nextSequentialCode(tx, "sale", "V");

    const customer = data.customer ? await findOrCreateCustomer(tx, data.customer, sellerId) : null;

    const sale = await tx.sale.create({
      data: {
        code,
        sellerId,
        // Every sale always needs preparador confirmation before inventory
        // is discounted — see confirmSale.
        status: "PENDIENTE_CONFIRMACION",
        customerId: customer?.id,
        paymentMethod: data.paymentMethod || null,
        notes: data.notes || null,
        items: {
          create: data.items.map((i, idx) => {
            const amounts = lineAmounts(i.quantity, i.unitPrice, i.discountPercent);
            return {
              position: idx,
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              discountPercent: i.discountPercent,
              notes: i.notes || null,
              ...amounts,
            };
          }),
        },
      },
    });

    await tx.notification.create({
      data: {
        type: "VENTA_PENDIENTE",
        title: "Nueva venta pendiente de confirmación",
        message: `${sale.code} fue registrada y espera preparación/confirmación.`,
        link: `/ventas/${sale.id}`,
        targetRole: "PREPARADOR",
        saleId: sale.id,
      },
    });

    return sale.id;
  });

  revalidatePath("/ventas");
  revalidatePath("/");
  return saleId;
}

/**
 * Corrects an already-registered sale: products, quantities, prices,
 * discounts, buyer, payment method, notes. Does NOT touch confirmation
 * status — use confirmSale/cancelSale for that.
 *
 * If inventory was already applied (sale is CONFIRMADA), the old line
 * quantities are reversed and the new ones re-applied in the same
 * transaction, so a product swap or quantity change lands as a single net
 * inventory correction rather than silently drifting from what's on the
 * shelf. If the sale is still PENDIENTE_CONFIRMACION, no inventory has
 * moved yet, so editing is just a data update.
 */
export async function updateSale(saleId: string, input: SaleFormValues) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  if (!can(session.user.role, "sales:edit")) {
    throw new Error("No tienes permisos para editar ventas");
  }

  const data = saleSchema.parse(input);

  await db.$transaction(async (tx) => {
    const sale = await tx.sale.findUniqueOrThrow({
      where: { id: saleId },
      include: { items: true },
    });
    if (sale.cancelledAt) throw new Error("No se puede editar una venta cancelada.");

    const customer = data.customer
      ? await findOrCreateCustomer(tx, data.customer, sale.sellerId)
      : null;

    if (sale.inventoryApplied) {
      for (const item of sale.items) {
        await recordInventoryMovement(tx, {
          productId: item.productId,
          type: "AJUSTE",
          quantity: item.quantity,
          reason: `Reverso por edición de ${sale.code}`,
          reference: `Edición ${sale.code}`,
          saleId: sale.id,
          userId: session.user.id,
        });
      }
    }

    await tx.saleItem.deleteMany({ where: { saleId } });

    await tx.sale.update({
      where: { id: saleId },
      data: {
        customerId: customer?.id ?? null,
        paymentMethod: data.paymentMethod || null,
        notes: data.notes || null,
        items: {
          create: data.items.map((i, idx) => {
            const amounts = lineAmounts(i.quantity, i.unitPrice, i.discountPercent);
            return {
              position: idx,
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              discountPercent: i.discountPercent,
              notes: i.notes || null,
              ...amounts,
            };
          }),
        },
      },
    });

    if (sale.inventoryApplied) {
      for (const item of data.items) {
        await recordInventoryMovement(tx, {
          productId: item.productId,
          type: "VENTA",
          quantity: -item.quantity,
          reference: `Venta ${sale.code} (editada)`,
          saleId: sale.id,
          userId: session.user.id,
        });
      }
    }
  });

  revalidatePath("/ventas");
  revalidatePath(`/ventas/${saleId}`);
  revalidatePath("/");
}

export async function confirmSale(saleId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  if (!can(session.user.role, "sales:confirm")) {
    throw new Error("No tienes permisos para confirmar ventas");
  }

  await db.$transaction(async (tx) => {
    const sale = await tx.sale.findUniqueOrThrow({
      where: { id: saleId },
      include: { items: true },
    });

    if (sale.status !== "PENDIENTE_CONFIRMACION" || sale.inventoryApplied) {
      throw new Error("Esta venta ya fue confirmada.");
    }

    for (const item of sale.items) {
      await recordInventoryMovement(tx, {
        productId: item.productId,
        type: "VENTA",
        quantity: -item.quantity,
        reference: `Venta ${sale.code}`,
        saleId: sale.id,
        userId: session.user.id,
      });
    }

    await tx.sale.update({
      where: { id: saleId },
      data: {
        status: "CONFIRMADA",
        inventoryApplied: true,
        confirmedById: session.user.id,
        confirmedAt: new Date(),
      },
    });

    await tx.notification.updateMany({
      where: { saleId: sale.id, read: false },
      data: { read: true },
    });
  });

  revalidatePath("/ventas");
  revalidatePath(`/ventas/${saleId}`);
  revalidatePath("/");
}

/**
 * Hard-deletes a sale outright (e.g. a duplicate or test entry) — distinct
 * from cancelSale, which keeps the sale visible with a cancellation reason.
 * If inventory was already applied, it's reversed first via the same AJUSTE
 * mechanism as cancelSale, so deleting a confirmed sale never leaves stock
 * silently short. SaleItems cascade with the sale; any InventoryMovement /
 * Notification rows that referenced it keep existing with saleId cleared.
 */
export async function deleteSale(saleId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  if (!can(session.user.role, "sales:delete")) {
    throw new Error("No tienes permisos para eliminar ventas");
  }

  await db.$transaction(async (tx) => {
    const sale = await tx.sale.findUniqueOrThrow({
      where: { id: saleId },
      include: { items: true },
    });

    if (sale.inventoryApplied) {
      for (const item of sale.items) {
        await recordInventoryMovement(tx, {
          productId: item.productId,
          type: "AJUSTE",
          quantity: item.quantity,
          reason: `Reverso por eliminación de ${sale.code}`,
          reference: `Eliminación ${sale.code}`,
          userId: session.user.id,
        });
      }
    }

    await tx.sale.delete({ where: { id: saleId } });
  });

  revalidatePath("/ventas");
  revalidatePath("/");
}

export async function cancelSale(saleId: string, reason: string) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  if (!can(session.user.role, "sales:cancel")) {
    throw new Error("No tienes permisos para cancelar ventas");
  }
  if (!reason.trim()) throw new Error("Indica un motivo de cancelación");

  await db.$transaction(async (tx) => {
    const sale = await tx.sale.findUniqueOrThrow({
      where: { id: saleId },
      include: { items: true },
    });
    if (sale.cancelledAt) throw new Error("Esta venta ya está cancelada.");

    if (sale.inventoryApplied) {
      for (const item of sale.items) {
        await recordInventoryMovement(tx, {
          productId: item.productId,
          type: "AJUSTE",
          quantity: item.quantity,
          reason: `Reverso por cancelación de ${sale.code}`,
          reference: `Cancelación ${sale.code}`,
          saleId: sale.id,
          userId: session.user.id,
        });
      }
    }

    await tx.sale.update({
      where: { id: saleId },
      data: {
        cancelledAt: new Date(),
        cancelReason: reason,
        inventoryApplied: false,
      },
    });
  });

  revalidatePath("/ventas");
  revalidatePath(`/ventas/${saleId}`);
  revalidatePath("/");
}
