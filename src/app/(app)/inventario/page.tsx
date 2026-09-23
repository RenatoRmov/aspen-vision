import Link from "next/link";
import { Plus, PackageSearch } from "lucide-react";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import {
  getCategoriesWithCounts,
  getProducts,
  type ProductFilters,
} from "@/server/queries/products";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ProductFilters as Filters } from "@/components/inventory/product-filters";
import { ProductTable } from "@/components/inventory/product-table";
import { CategoryRail } from "@/components/inventory/category-rail";
import { InventoryExportMenu } from "@/components/inventory/inventory-export-menu";
import { ImportProductsDialog } from "@/components/inventory/import-products-dialog";

export default async function InventoryPage({
  searchParams,
}: PageProps<"/inventario">) {
  const sp = await searchParams;
  const session = await auth();
  const canManage = session ? can(session.user.role, "inventory:manage") : false;

  const filters: ProductFilters = {
    q: typeof sp.q === "string" ? sp.q : undefined,
    categorySlug: typeof sp.cat === "string" ? sp.cat : undefined,
    availability: (typeof sp.disp === "string" ? sp.disp : "all") as ProductFilters["availability"],
    sort: (typeof sp.sort === "string" ? sp.sort : "recent") as ProductFilters["sort"],
  };

  const [products, { categories, totalActive }] = await Promise.all([
    getProducts(filters),
    getCategoriesWithCounts(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario"
        description={`${products.length} producto(s) en catálogo`}
        actions={
          <div className="flex flex-wrap gap-2">
            <InventoryExportMenu />
            {canManage && <ImportProductsDialog />}
            {canManage && (
              <Button render={<Link href="/inventario/nuevo" />} nativeButton={false}>
                <Plus className="h-4 w-4" />
                Nuevo producto
              </Button>
            )}
          </div>
        }
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        <CategoryRail categories={categories} totalActive={totalActive} />

        <div className="min-w-0 flex-1 space-y-4">
          <Filters />

          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-20 text-center">
              <PackageSearch className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">No se encontraron productos</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Ajusta los filtros de búsqueda o registra un nuevo producto en
                el catálogo.
              </p>
            </div>
          ) : (
            <ProductTable products={products} />
          )}
        </div>
      </div>
    </div>
  );
}
