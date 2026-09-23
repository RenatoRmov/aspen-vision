import { NextResponse } from "next/server";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getProducts, type ProductFilters } from "@/server/queries/products";
import { primaryImage } from "@/lib/product-images";
import { resolveImageSrc } from "@/lib/pdf/resolve-image";
import { InventoryCatalogDocument, type CatalogProduct } from "@/lib/pdf/inventory-catalog";
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
  // The PDF is a printable catalog for the shop floor / a client, so an
  // item with nothing left to sell never belongs in it — unlike the
  // Disponibilidad filter above, this is unconditional, not something the
  // export mirrors from the screen.
  const inStock = products.filter((p) => p.stock > 0);

  const catalogProducts: CatalogProduct[] = await Promise.all(
    inStock.map(async (p) => ({
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
