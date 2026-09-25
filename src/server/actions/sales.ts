"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { recordInventoryMovements, nextSequentialCode } from "@/server/inventory";
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

// Every action below returns one of these instead of throwing. This Next.js/
// React version turns ANY error thrown out of a Server Action into a raw
// HTTP 500 (confirmed directly: an identical "Esta venta ya fue confirmada."
// throw 500'd whether it was raised inside the db.$transaction or re-thrown
// from a catch block outside it) instead of the normal graceful rejection a
// client's try/catch expects — so a perfectly ordinary, expected condition
// (double-confirm, insufficient stock, no permission) crashed the whole page
// with an opaque digest-only error. Returning `{ ok: false, error }` sidesteps
// that entirely: nothing here ever throws past its own try/catch, so there's
// nothing for that bug to corrupt in transit.
type Ok<T = object> = { ok: true } & T;
type Err = { ok: false; error: string };
type Result<T = object> = Ok<T> | Err;

function fail(err: unknown, fallback: string): Err {
  return { ok: false, error: err instanceof Error ? err.message : fallback };
}

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

export async function createSale(input: SaleFormValues): Promise<Result<{ id: string }>> {
  try {
    const session = await auth();
    if (!session?.user) return fail(null, "No autorizado");
    if (!can(session.user.role, "sales:create")) {
      return { ok: false, error: "No tienes permisos para registrar ventas" };
    }

    const data = saleSchema.parse(input);
    // Enforced again here, not just in the form's step-gating UI — every sale
    // must be tied to an identified customer now.
    if (!data.customer) {
      return { ok: false, error: "Selecciona un cliente para registrar la venta" };
    }
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
    return { ok: true, id: saleId };
  } catch (err) {
    return fail(err, "No se pudo registrar la venta");
  }
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
export async function updateSale(saleId: string, input: SaleFormValues): Promise<Result> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "No autorizado" };
    if (!can(session.user.role, "sales:edit")) {
      return { ok: false, error: "No tienes permisos para editar ventas" };
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
        await recordInventoryMovements(
          tx,
          sale.items.map((item) => ({
            productId: item.productId,
            type: "AJUSTE" as const,
            quantity: item.quantity,
            reason: `Reverso por edición de ${sale.code}`,
            reference: `Edición ${sale.code}`,
            saleId: sale.id,
            userId: session.user.id,
            allowNegative: true,
          })),
        );
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
        await recordInventoryMovements(
          tx,
          data.items.map((item) => ({
            productId: item.productId,
            type: "VENTA" as const,
            quantity: -item.quantity,
            reference: `Venta ${sale.code} (editada)`,
            saleId: sale.id,
            userId: session.user.id,
            allowNegative: true,
          })),
        );
      }
    });

    revalidatePath("/ventas");
    revalidatePath(`/ventas/${saleId}`);
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return fail(err, "No se pudo actualizar la venta");
  }
}

export type StockShortage = { name: string; stock: number };

export async function confirmSale(saleId: string): Promise<Result<{ shortages: StockShortage[] }>> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "No autorizado" };
    if (!can(session.user.role, "sales:confirm")) {
      return { ok: false, error: "No tienes permisos para confirmar ventas" };
    }

    let shortages: StockShortage[] = [];

    await db.$transaction(async (tx) => {
      const sale = await tx.sale.findUniqueOrThrow({
        where: { id: saleId },
        include: { items: { include: { product: true } } },
      });

      if (sale.status !== "PENDIENTE_CONFIRMACION" || sale.inventoryApplied) {
        throw new Error("Esta venta ya fue confirmada.");
      }

      // A sale already happened commercially — confirming it discounts stock
      // to match reality even if the shelf count says there isn't enough,
      // rather than blocking the preparador. The resulting shortage is
      // surfaced as a warning instead (see StockShortage above).
      const newStocks = await recordInventoryMovements(
        tx,
        sale.items.map((item) => ({
          productId: item.productId,
          type: "VENTA" as const,
          quantity: -item.quantity,
          reference: `Venta ${sale.code}`,
          saleId: sale.id,
          userId: session.user.id,
          allowNegative: true,
        })),
      );
      shortages = sale.items
        .map((item, i) => ({ item, newStock: newStocks[i] }))
        .filter(({ newStock }) => newStock < 0)
        .map(({ item, newStock }) => ({
          name: `${item.product.brand} ${item.product.model}`,
          stock: newStock,
        }));

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
    return { ok: true, shortages };
  } catch (err) {
    return fail(err, "No se pudo confirmar la venta");
  }
}

/**
 * Hard-deletes a sale outright (e.g. a duplicate or test entry) — distinct
 * from cancelSale, which keeps the sale visible with a cancellation reason.
 * If inventory was already applied, it's reversed first via the same AJUSTE
 * mechanism as cancelSale, so deleting a confirmed sale never leaves stock
 * silently short. SaleItems cascade with the sale; any InventoryMovement /
 * Notification rows that referenced it keep existing with saleId cleared.
 */
export async function deleteSale(saleId: string): Promise<Result> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "No autorizado" };
    if (!can(session.user.role, "sales:delete")) {
      return { ok: false, error: "No tienes permisos para eliminar ventas" };
    }

    await db.$transaction(async (tx) => {
      const sale = await tx.sale.findUniqueOrThrow({
        where: { id: saleId },
        include: { items: true },
      });

      if (sale.inventoryApplied) {
        await recordInventoryMovements(
          tx,
          sale.items.map((item) => ({
            productId: item.productId,
            type: "AJUSTE" as const,
            quantity: item.quantity,
            reason: `Reverso por eliminación de ${sale.code}`,
            reference: `Eliminación ${sale.code}`,
            userId: session.user.id,
            allowNegative: true,
          })),
        );
      }

      await tx.sale.delete({ where: { id: saleId } });
    });

    revalidatePath("/ventas");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return fail(err, "No se pudo eliminar la venta");
  }
}

export async function cancelSale(saleId: string, reason: string): Promise<Result> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "No autorizado" };
    if (!can(session.user.role, "sales:cancel")) {
      return { ok: false, error: "No tienes permisos para cancelar ventas" };
    }
    if (!reason.trim()) return { ok: false, error: "Indica un motivo de cancelación" };

    await db.$transaction(async (tx) => {
      const sale = await tx.sale.findUniqueOrThrow({
        where: { id: saleId },
        include: { items: true },
      });
      if (sale.cancelledAt) throw new Error("Esta venta ya está cancelada.");

      if (sale.inventoryApplied) {
        await recordInventoryMovements(
          tx,
          sale.items.map((item) => ({
            productId: item.productId,
            type: "AJUSTE" as const,
            quantity: item.quantity,
            reason: `Reverso por cancelación de ${sale.code}`,
            reference: `Cancelación ${sale.code}`,
            saleId: sale.id,
            userId: session.user.id,
            allowNegative: true,
          })),
        );
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
    return { ok: true };
  } catch (err) {
    return fail(err, "No se pudo cancelar la venta");
  }
}
