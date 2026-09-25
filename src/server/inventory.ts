import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { MovementType } from "@/generated/prisma/enums";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";

type Tx = Prisma.TransactionClient;

/**
 * The single choke point for every stock change in the system. Always call
 * this inside a `db.$transaction`, never update `Product.stock` directly —
 * this is what keeps the cached counter and the movement ledger consistent,
 * and what stops a product from ever going negative.
 */
export async function recordInventoryMovement(
  tx: Tx,
  params: {
    productId: string;
    type: MovementType;
    quantity: number; // signed: positive = in, negative = out
    userId: string;
    reason?: string;
    reference?: string;
    saleId?: string;
    ambassadorDeliveryId?: string;
    warrantyId?: string;
    // A confirmed sale is a real-world transaction that already happened —
    // refusing to record it just because the shelf count says otherwise
    // would block the preparador from confirming a sale that legitimately
    // occurred. Every other caller keeps the hard guard.
    allowNegative?: boolean;
  },
) {
  const product = await tx.product.findUniqueOrThrow({
    where: { id: params.productId },
  });

  const newStock = product.stock + params.quantity;
  if (newStock < 0 && !params.allowNegative) {
    throw new Error(
      `Stock insuficiente para ${product.brand} ${product.model}. Disponible: ${product.stock}, solicitado: ${-params.quantity}.`,
    );
  }

  await tx.product.update({
    where: { id: params.productId },
    data: { stock: newStock },
  });

  await tx.inventoryMovement.create({
    data: {
      productId: params.productId,
      type: params.type,
      quantity: params.quantity,
      reason: params.reason,
      reference: params.reference,
      userId: params.userId,
      saleId: params.saleId,
      ambassadorDeliveryId: params.ambassadorDeliveryId,
      warrantyId: params.warrantyId,
    },
  });

  // Notify only when crossing a threshold, not on every subsequent movement,
  // so the notification bell doesn't spam on every unit sold.
  const wasLow = product.stock <= LOW_STOCK_THRESHOLD;
  const isLow = newStock <= LOW_STOCK_THRESHOLD;
  if (!wasLow && isLow && newStock > 0) {
    await tx.notification.create({
      data: {
        type: "STOCK_BAJO",
        title: "Stock bajo",
        message: `${product.brand} ${product.model} llegó a ${newStock} unidad(es), bajo el mínimo (${LOW_STOCK_THRESHOLD}).`,
        link: `/inventario/${product.id}`,
        targetRole: "ADMIN",
      },
    });
  }
  const wasOut = product.stock <= 0;
  if (!wasOut && newStock <= 0) {
    await tx.notification.create({
      data: {
        type: "STOCK_AGOTADO",
        title: "Producto agotado",
        message: `${product.brand} ${product.model} se quedó sin stock.`,
        link: `/inventario/${product.id}`,
        targetRole: "ADMIN",
      },
    });
  }

  return newStock;
}

export async function nextSequentialCode(
  tx: Tx,
  model: "sale" | "ambassadorDelivery" | "warranty",
  prefix: string,
) {
  const count = await (tx[model] as { count: () => Promise<number> }).count();
  return `${prefix}-${String(count + 1).padStart(6, "0")}`;
}
