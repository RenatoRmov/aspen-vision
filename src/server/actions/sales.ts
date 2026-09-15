"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { recordInventoryMovement, nextSequentialCode } from "@/server/inventory";
import { canonicalRut } from "@/lib/rut";
import type { Prisma } from "@/generated/prisma/client";

const IVA_RATE = 0.19;

const saleItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().int().min(0),
  notes: z.string().trim().optional(),
});

const customerSchema = z.object({
  name: z.string().trim().min(1, "El nombre del comprador es obligatorio"),
  rut: z.string().trim().min(3, "El RUT es obligatorio"),
  businessName: z.string().trim().optional(),
});

const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "Agrega al menos un producto"),
  requiresConfirmation: z.boolean(),
  customer: customerSchema.optional(),
  paymentMethod: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  sellerId: z.string().optional(),
});

export type SaleFormValues = z.infer<typeof saleSchema>;

function lineAmounts(quantity: number, unitPrice: number) {
  const subtotal = quantity * unitPrice;
  const taxAmount = Math.round(subtotal * IVA_RATE);
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}

async function findOrCreateCustomer(
  tx: Prisma.TransactionClient,
  input: z.infer<typeof customerSchema>,
) {
  const rut = canonicalRut(input.rut);
  const existing = await tx.customer.findUnique({ where: { rut } });
  if (existing) {
    if (existing.name !== input.name || existing.businessName !== (input.businessName || null)) {
      return tx.customer.update({
        where: { id: existing.id },
        data: { name: input.name, businessName: input.businessName || existing.businessName },
      });
    }
    return existing;
  }
  return tx.customer.create({
    data: { name: input.name, rut, businessName: input.businessName || null },
  });
}

export async function createSale(input: SaleFormValues) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  if (!can(session.user.role, "sales:create")) {
    throw new Error("No tienes permisos para registrar ventas");
  }

  const data = saleSchema.parse(input);
  const sellerId =
    session.user.role === "ADMIN" && data.sellerId ? data.sellerId : session.user.id;

  const saleId = await db.$transaction(async (tx) => {
    const code = await nextSequentialCode(tx, "sale", "V");
    const now = new Date();

    const customer = data.customer ? await findOrCreateCustomer(tx, data.customer) : null;

    const sale = await tx.sale.create({
      data: {
        code,
        sellerId,
        requiresConfirmation: data.requiresConfirmation,
        status: data.requiresConfirmation ? "PENDIENTE_CONFIRMACION" : "CONFIRMADA",
        inventoryApplied: !data.requiresConfirmation,
        confirmedById: data.requiresConfirmation ? null : sellerId,
        confirmedAt: data.requiresConfirmation ? null : now,
        customerId: customer?.id,
        paymentMethod: data.paymentMethod || null,
        notes: data.notes || null,
        items: {
          create: data.items.map((i, idx) => {
            const amounts = lineAmounts(i.quantity, i.unitPrice);
            return {
              position: idx,
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              notes: i.notes || null,
              ...amounts,
            };
          }),
        },
      },
    });

    if (!data.requiresConfirmation) {
      for (const item of data.items) {
        await recordInventoryMovement(tx, {
          productId: item.productId,
          type: "VENTA",
          quantity: -item.quantity,
          reference: `Venta ${sale.code}`,
          saleId: sale.id,
          userId: session.user.id,
        });
      }
    } else {
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
    }

    return sale.id;
  });

  revalidatePath("/ventas");
  revalidatePath("/");
  return saleId;
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
