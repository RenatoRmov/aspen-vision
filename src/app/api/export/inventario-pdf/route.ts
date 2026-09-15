import { NextResponse } from "next/server";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { primaryImage } from "@/lib/product-images";
import { resolveImageSrc } from "@/lib/pdf/resolve-image";
import { InventoryCatalogDocument, type CatalogProduct } from "@/lib/pdf/inventory-catalog";
import { formatDate } from "@/lib/format";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!can(session.user.role, "reports:view")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const products = await db.product.findMany({
    where: { active: true },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    include: { category: true },
  });

  const catalogProducts: CatalogProduct[] = await Promise.all(
    products.map(async (p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      model: p.model,
      barcode: p.barcode,
      categoryName: p.category.name,
      shape: p.shape,
      color: p.color,
      material: p.material,
      stock: p.stock,
      active: p.active,
      imageSrc: await resolveImageSrc(primaryImage(p.images) ?? ""),
    })),
  );

  const buffer = await renderToBuffer(
    createElement(InventoryCatalogDocument, {
      products: catalogProducts,
    }) as Parameters<typeof renderToBuffer>[0],
  );

  const stamp = formatDate(new Date()).replace(/\s/g, "-");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="inventario-${stamp}.pdf"`,
    },
  });
}
