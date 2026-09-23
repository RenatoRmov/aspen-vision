import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getProducts, type ProductFilters } from "@/server/queries/products";
import { formatDate } from "@/lib/format";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!can(session.user.role, "reports:view")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const filters: ProductFilters = {
    q: searchParams.get("q") ?? undefined,
    categorySlug: searchParams.get("cat") ?? undefined,
    availability: (searchParams.get("disp") ?? "all") as ProductFilters["availability"],
    sort: (searchParams.get("sort") ?? "recent") as ProductFilters["sort"],
  };

  const products = await getProducts(filters);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Aspen Vision";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Inventario");
  sheet.columns = [
    { header: "Nombre producto", key: "name", width: 28 },
    { header: "Categoría", key: "category", width: 14 },
    { header: "Marca", key: "brand", width: 14 },
    { header: "Modelo", key: "model", width: 20 },
    { header: "Forma", key: "shape", width: 14 },
    { header: "Color", key: "color", width: 14 },
    { header: "Material", key: "material", width: 14 },
    { header: "Código de barras", key: "barcode", width: 18 },
    { header: "Stock Total", key: "stock", width: 12 },
    { header: "Estado", key: "active", width: 10 },
    { header: "Notas", key: "notes", width: 30 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEFEADD" },
  };

  for (const p of products) {
    sheet.addRow({
      name: p.name,
      category: p.category.name,
      brand: p.brand,
      model: p.model,
      shape: p.shape ?? "",
      color: p.color ?? "",
      material: p.material ?? "",
      barcode: p.barcode,
      stock: p.stock,
      active: p.active ? "Activo" : "Inactivo",
      notes: p.notes ?? "",
    });
  }

  sheet.autoFilter = { from: "A1", to: "K1" };

  const buffer = await workbook.xlsx.writeBuffer();
  const stamp = formatDate(new Date()).replace(/\s/g, "-");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="inventario-${stamp}.xlsx"`,
    },
  });
}
