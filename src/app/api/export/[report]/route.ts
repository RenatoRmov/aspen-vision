import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { csvResponse } from "@/lib/csv";
import { resolveRange } from "@/lib/date-range";
import { formatDate, formatDateTime } from "@/lib/format";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { formatRut } from "@/lib/rut";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ report: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!can(session.user.role, "reports:view")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { report } = await params;
  const { searchParams } = new URL(request.url);
  const { from, to } = resolveRange(
    searchParams.get("range") ?? undefined,
    searchParams.get("from") ?? undefined,
    searchParams.get("to") ?? undefined,
  );
  const stamp = formatDate(new Date()).replace(/\s/g, "-");

  switch (report) {
    case "ventas": {
      const sales = await db.sale.findMany({
        where: { date: { gte: from, lte: to } },
        orderBy: { date: "desc" },
        include: { seller: true, customer: true, items: { include: { product: true }, orderBy: { position: "asc" } } },
      });
      const rows = sales.flatMap((s) =>
        s.items.map((i) => ({
          Código: s.code,
          Fecha: formatDateTime(s.date),
          Vendedor: s.seller.name,
          Producto: i.product.name,
          "Código de barras": i.product.barcode,
          Cantidad: i.quantity,
          "Precio unitario": i.unitPrice,
          "% Descuento": i.discountPercent,
          "Monto descuento": i.discountAmount,
          Neto: i.subtotal,
          Estado: s.status === "CONFIRMADA" ? "Confirmada" : "Pendiente de confirmación",
          Cliente: s.customer?.name ?? "",
          RUT: s.customer ? formatRut(s.customer.rut) : "",
          "Razón social": s.customer?.businessName ?? "",
          Cancelada: s.cancelledAt ? "Sí" : "No",
        })),
      );
      return csvResponse(`ventas-${stamp}.csv`, rows);
    }

    case "inventario": {
      const products = await db.product.findMany({
        include: { category: true },
        orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
      });
      const rows = products.map((p) => ({
        "Nombre producto": p.name,
        Categoría: p.category.name,
        Marca: p.brand,
        Modelo: p.model,
        Forma: p.shape ?? "",
        Color: p.color ?? "",
        Material: p.material ?? "",
        "Código de barras": p.barcode,
        "Stock Total": p.stock,
        Activo: p.active ? "Sí" : "No",
      }));
      return csvResponse(`inventario-${stamp}.csv`, rows);
    }

    case "movimientos": {
      const movements = await db.inventoryMovement.findMany({
        where: { createdAt: { gte: from, lte: to } },
        orderBy: { createdAt: "desc" },
        include: { product: true, user: true },
      });
      const rows = movements.map((m) => ({
        Fecha: formatDateTime(m.createdAt),
        Tipo: m.type,
        Producto: m.product.name,
        "Código de barras": m.product.barcode,
        Cantidad: m.quantity,
        Referencia: m.reference ?? "",
        Motivo: m.reason ?? "",
        Usuario: m.user.name,
      }));
      return csvResponse(`movimientos-${stamp}.csv`, rows);
    }

    case "embajadores": {
      const deliveries = await db.ambassadorDelivery.findMany({
        where: { date: { gte: from, lte: to } },
        orderBy: { date: "desc" },
        include: { ambassador: true, deliveredBy: true, items: { include: { product: true } } },
      });
      const rows = deliveries.flatMap((d) =>
        d.items.map((i) => ({
          Código: d.code,
          Fecha: formatDateTime(d.date),
          Embajador: d.ambassador.name,
          Producto: i.product.name,
          Cantidad: i.quantity,
          "Entregado por": d.deliveredBy.name,
          Notas: d.notes ?? "",
        })),
      );
      return csvResponse(`embajadores-${stamp}.csv`, rows);
    }

    case "garantias": {
      const warranties = await db.warranty.findMany({
        where: { date: { gte: from, lte: to } },
        orderBy: { date: "desc" },
        include: { product: true, responsible: true },
      });
      const rows = warranties.map((w) => ({
        Código: w.code,
        Fecha: formatDateTime(w.date),
        Cliente: w.customerName,
        Producto: w.product.name,
        Cantidad: w.quantity,
        Motivo: w.reason,
        Estado: w.status,
        Responsable: w.responsible?.name ?? "",
      }));
      return csvResponse(`garantias-${stamp}.csv`, rows);
    }

    case "stock-bajo": {
      const products = await db.product.findMany({
        where: { active: true },
        include: { category: true },
      });
      const rows = products
        .filter((p) => p.stock <= LOW_STOCK_THRESHOLD)
        .map((p) => ({
          "Nombre producto": p.name,
          Marca: p.brand,
          Modelo: p.model,
          Categoría: p.category.name,
          "Código de barras": p.barcode,
          "Stock Total": p.stock,
        }));
      return csvResponse(`stock-bajo-${stamp}.csv`, rows);
    }

    default:
      return NextResponse.json({ error: "Reporte no válido" }, { status: 400 });
  }
}
