import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { MovementType } from "@/generated/prisma/enums";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";

type Tx = Prisma.TransactionClient;

type MovementInput = {
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
};

/**
 * The single choke point for every stock change in the system — bulk form.
 * Always call this (or the single-item wrapper below) inside a
 * `db.$transaction`, never update `Product.stock` directly.
 *
 * Processes every entry with ONE bulk read and ONE bulk write, regardless of
 * how many there are: a naive per-item loop (read, write, read, write, ...)
 * spends one full network round trip to Postgres per step, and a sale with
 * a hundred-plus lines was blowing Prisma's interactive-transaction timeout
 * that way. This reads every affected product once, replays the deltas in
 * memory (so two entries touching the same product still see each other,
 * same as a sequential loop would), then applies all the resulting stocks in
 * one statement and inserts the whole ledger/notification batch at once.
 */
export async function recordInventoryMovements(tx: Tx, entries: MovementInput[]): Promise<number[]> {
  if (entries.length === 0) return [];

  const productIds = [...new Set(entries.map((e) => e.productId))];
  const products = await tx.product.findMany({ where: { id: { in: productIds } } });
  const productById = new Map(products.map((p) => [p.id, p]));
  if (productById.size !== productIds.length) {
    throw new Error("Uno o más productos de la operación ya no existen.");
  }

  const runningStock = new Map(products.map((p) => [p.id, p.stock]));
  const results: number[] = [];
  const notifications: Prisma.NotificationCreateManyInput[] = [];

  for (const e of entries) {
    const product = productById.get(e.productId)!;
    const before = runningStock.get(e.productId)!;
    const after = before + e.quantity;
    if (after < 0 && !e.allowNegative) {
      throw new Error(
        `Stock insuficiente para ${product.brand} ${product.model}. Disponible: ${before}, solicitado: ${-e.quantity}.`,
      );
    }
    runningStock.set(e.productId, after);
    results.push(after);

    // Notify only when crossing a threshold, not on every subsequent
    // movement, so the notification bell doesn't spam on every unit sold.
    const wasLow = before <= LOW_STOCK_THRESHOLD;
    const isLow = after <= LOW_STOCK_THRESHOLD;
    if (!wasLow && isLow && after > 0) {
      notifications.push({
        type: "STOCK_BAJO",
        title: "Stock bajo",
        message: `${product.brand} ${product.model} llegó a ${after} unidad(es), bajo el mínimo (${LOW_STOCK_THRESHOLD}).`,
        link: `/inventario/${product.id}`,
        targetRole: "ADMIN",
      });
    }
    const wasOut = before <= 0;
    if (!wasOut && after <= 0) {
      notifications.push({
        type: "STOCK_AGOTADO",
        title: "Producto agotado",
        message: `${product.brand} ${product.model} se quedó sin stock.`,
        link: `/inventario/${product.id}`,
        targetRole: "ADMIN",
      });
    }
  }

  // One statement for every product's final stock, via a VALUES join —
  // Prisma has no "update many rows with different values" API, and a
  // Promise.all of per-row updates still pays one round trip each.
  const finalStocks = productIds.map((id) => ({ id, stock: runningStock.get(id)! }));
  await tx.$executeRaw`
    UPDATE "Product" AS p
    SET stock = v.stock
    FROM (VALUES ${Prisma.join(
      finalStocks.map((f) => Prisma.sql`(${f.id}::text, ${f.stock}::int)`),
    )}) AS v(id, stock)
    WHERE p.id = v.id
  `;

  await tx.inventoryMovement.createMany({
    data: entries.map((e) => ({
      productId: e.productId,
      type: e.type,
      quantity: e.quantity,
      reason: e.reason,
      reference: e.reference,
      userId: e.userId,
      saleId: e.saleId,
      ambassadorDeliveryId: e.ambassadorDeliveryId,
      warrantyId: e.warrantyId,
    })),
  });

  if (notifications.length > 0) {
    await tx.notification.createMany({ data: notifications });
  }

  return results;
}

/** Single-item convenience wrapper around {@link recordInventoryMovements} —
 * same guarantees, for the many call sites that only ever touch one product
 * (a single warranty claim, a single manual ajuste, one ambassador-delivery
 * line at a time). */
export async function recordInventoryMovement(tx: Tx, params: MovementInput): Promise<number> {
  const [newStock] = await recordInventoryMovements(tx, [params]);
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
