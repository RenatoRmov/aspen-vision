import "server-only";
import { db } from "@/lib/db";
import { bucketGranularity } from "@/lib/date-range";
import { format } from "date-fns";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { primaryImage } from "@/lib/product-images";

export async function getDashboardData(from: Date, to: Date) {
  const [sales, movementTotals, totalStockAgg, pendingSales, ambassadorUnits, warrantyUnits] =
    await Promise.all([
      db.sale.findMany({
        where: { date: { gte: from, lte: to }, cancelledAt: null },
        select: {
          id: true,
          code: true,
          date: true,
          status: true,
          sellerId: true,
          seller: { select: { name: true } },
          customerId: true,
          customer: { select: { id: true, name: true } },
          items: {
            select: {
              quantity: true,
              subtotal: true,
              taxAmount: true,
              total: true,
              productId: true,
              product: {
                select: {
                  name: true,
                  brand: true,
                  model: true,
                  categoryId: true,
                  category: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
      db.inventoryMovement.groupBy({
        by: ["type"],
        where: { createdAt: { gte: from, lte: to } },
        _sum: { quantity: true },
      }),
      db.product.aggregate({ where: { active: true }, _sum: { stock: true } }),
      db.sale.findMany({
        where: { status: "PENDIENTE_CONFIRMACION" },
        orderBy: { date: "asc" },
        take: 6,
        select: {
          id: true,
          code: true,
          date: true,
          seller: { select: { name: true } },
          items: { select: { quantity: true, subtotal: true, total: true } },
        },
      }),
      db.ambassadorDeliveryItem.aggregate({
        where: { delivery: { date: { gte: from, lte: to } } },
        _sum: { quantity: true },
      }),
      db.warranty.aggregate({
        where: { date: { gte: from, lte: to } },
        _sum: { quantity: true },
      }),
    ]);

  const activeProducts = await db.product.findMany({
    where: { active: true },
    select: { id: true, name: true, brand: true, model: true, stock: true, images: true },
  });
  const lowStockProducts = activeProducts
    .filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 8)
    .map((p) => ({ ...p, imageUrl: primaryImage(p.images) }));
  const outOfStockProducts = activeProducts.filter((p) => p.stock <= 0);

  const revenue = sales.reduce((sum, s) => sum + s.items.reduce((a, i) => a + i.subtotal, 0), 0);
  const revenueWithTax = sales.reduce((sum, s) => sum + s.items.reduce((a, i) => a + i.total, 0), 0);
  const unitsSold = sales.reduce((sum, s) => sum + s.items.reduce((a, i) => a + i.quantity, 0), 0);

  const productTotals = new Map<
    string,
    { name: string; qty: number; orders: Set<string>; net: number; withTax: number }
  >();
  const sellerTotals = new Map<string, { name: string; revenue: number; qty: number }>();
  const categoryTotals = new Map<
    string,
    { name: string; qty: number; orders: Set<string>; net: number; withTax: number }
  >();
  const customerTotals = new Map<
    string,
    { name: string; orders: Set<string>; net: number; withTax: number }
  >();

  for (const s of sales) {
    const sellerName = s.seller.name;
    const sellerEntry = sellerTotals.get(s.sellerId) ?? { name: sellerName, revenue: 0, qty: 0 };

    if (s.customerId && s.customer) {
      const cEntry = customerTotals.get(s.customerId) ?? {
        name: s.customer.name,
        orders: new Set<string>(),
        net: 0,
        withTax: 0,
      };
      cEntry.orders.add(s.id);
      customerTotals.set(s.customerId, cEntry);
    }

    for (const item of s.items) {
      sellerEntry.revenue += item.subtotal;
      sellerEntry.qty += item.quantity;

      const pKey = item.productId;
      const p = productTotals.get(pKey) ?? {
        name: item.product.name || `${item.product.brand} ${item.product.model}`,
        qty: 0,
        orders: new Set<string>(),
        net: 0,
        withTax: 0,
      };
      p.qty += item.quantity;
      p.orders.add(s.id);
      p.net += item.subtotal;
      p.withTax += item.total;
      productTotals.set(pKey, p);

      const catId = item.product.categoryId;
      const cat = categoryTotals.get(catId) ?? {
        name: item.product.category.name,
        qty: 0,
        orders: new Set<string>(),
        net: 0,
        withTax: 0,
      };
      cat.qty += item.quantity;
      cat.orders.add(s.id);
      cat.net += item.subtotal;
      cat.withTax += item.total;
      categoryTotals.set(catId, cat);

      if (s.customerId) {
        const cEntry = customerTotals.get(s.customerId)!;
        cEntry.net += item.subtotal;
        cEntry.withTax += item.total;
      }
    }
    sellerTotals.set(s.sellerId, sellerEntry);
  }

  const rankedProducts = [...productTotals.values()]
    .map((p) => ({ name: p.name, qty: p.qty, orders: p.orders.size, net: p.net, withTax: p.withTax }))
    .sort((a, b) => b.qty - a.qty);
  const topProducts = rankedProducts.slice(0, 8); // compact chart data
  const topProductsTable = rankedProducts.slice(0, 40); // paginated table (client-side, 10/page)

  // "Least sold" includes products with zero sales in the period so dead
  // stock actually surfaces, not just the worst among what sold.
  const soldQtyByProduct = new Map(
    [...productTotals.entries()].map(([id, v]) => [id, v.qty]),
  );
  const leastSoldProducts = activeProducts
    .map((p) => ({
      name: p.name || `${p.brand} ${p.model}`,
      qty: soldQtyByProduct.get(p.id) ?? 0,
    }))
    .sort((a, b) => a.qty - b.qty)
    .slice(0, 10);

  const salesBySeller = [...sellerTotals.values()].sort((a, b) => b.revenue - a.revenue);

  const topCategories = [...categoryTotals.values()]
    .map((c) => ({ name: c.name, qty: c.qty, orders: c.orders.size, net: c.net, withTax: c.withTax }))
    .sort((a, b) => b.withTax - a.withTax)
    .slice(0, 10);

  const topCustomers = [...customerTotals.values()]
    .map((c) => ({ name: c.name, orders: c.orders.size, net: c.net, withTax: c.withTax }))
    .sort((a, b) => b.withTax - a.withTax)
    .slice(0, 8);

  const granularity = bucketGranularity(from, to);
  const bucketKey = (d: Date) => {
    if (granularity === "hour") return format(d, "HH:00");
    if (granularity === "day") return format(d, "dd MMM");
    return format(d, "MMM yyyy");
  };
  const seriesMap = new Map<string, { label: string; revenue: number; qty: number }>();
  for (const s of sales) {
    const key = bucketKey(new Date(s.date));
    const entry = seriesMap.get(key) ?? { label: key, revenue: 0, qty: 0 };
    entry.revenue += s.items.reduce((a, i) => a + i.subtotal, 0);
    entry.qty += s.items.reduce((a, i) => a + i.quantity, 0);
    seriesMap.set(key, entry);
  }
  const salesSeries = [...seriesMap.values()];

  const movementsByType = Object.fromEntries(
    movementTotals.map((m) => [m.type, Math.abs(m._sum.quantity ?? 0)]),
  ) as Record<string, number>;

  return {
    revenue,
    revenueWithTax,
    unitsSold,
    salesCount: sales.length,
    avgTicket: sales.length ? Math.round(revenue / sales.length) : 0,
    totalStockUnits: totalStockAgg._sum.stock ?? 0,
    lowStockCount: lowStockProducts.length,
    outOfStockCount: outOfStockProducts.length,
    lowStockProducts,
    outOfStockProducts,
    topProducts,
    topProductsTable,
    leastSoldProducts,
    topCategories,
    topCustomers,
    salesBySeller,
    salesSeries,
    movementsByType,
    ambassadorUnits: ambassadorUnits._sum.quantity ?? 0,
    warrantyUnits: warrantyUnits._sum.quantity ?? 0,
    pendingSales: pendingSales.map((s) => ({
      id: s.id,
      code: s.code,
      date: s.date,
      sellerName: s.seller.name,
      total: s.items.reduce((a, i) => a + i.total, 0),
      units: s.items.reduce((a, i) => a + i.quantity, 0),
    })),
    pendingSalesTotalCount: pendingSales.length,
  };
}
