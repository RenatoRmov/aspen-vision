import Link from "next/link";
import { notFound } from "next/navigation";
import { Barcode, Pencil } from "lucide-react";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getProductWithHistory } from "@/server/queries/products";
import { parseImages } from "@/lib/product-images";
import { PageHeader } from "@/components/shared/page-header";
import { StockBadge } from "@/components/shared/stock-badge";
import { Button } from "@/components/ui/button";
import { StockActions } from "@/components/inventory/stock-actions";
import { MovementHistory } from "@/components/inventory/movement-history";
import { ActiveToggle } from "@/components/inventory/active-toggle";
import { ProductGallery } from "@/components/inventory/product-gallery";

export default async function ProductDetailPage({
  params,
}: PageProps<"/inventario/[id]">) {
  const { id } = await params;
  const data = await getProductWithHistory(id);
  if (!data) notFound();
  const { product, movements } = data;
  const images = parseImages(product.images);

  const session = await auth();
  const canManage = session ? can(session.user.role, "inventory:manage") : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={`${product.category.name} · ${product.brand} ${product.model}`}
        actions={
          canManage ? (
            <div className="flex gap-2">
              <ActiveToggle productId={product.id} active={product.active} />
              <Button
                variant="outline"
                render={<Link href={`/inventario/${product.id}/editar`} />}
                nativeButton={false}
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <ProductGallery images={images} alt={product.name} inactive={!product.active} />

          <div className="space-y-3 rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Stock Total</span>
              <StockBadge stock={product.stock} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Barcode className="h-3.5 w-3.5" /> Código
              </span>
              <span className="font-mono text-sm">{product.barcode}</span>
            </div>
            {(product.shape || product.color || product.material) && (
              <div className="grid grid-cols-3 gap-2 border-t pt-3 text-center text-xs">
                <div>
                  <p className="text-muted-foreground">Forma</p>
                  <p className="font-medium">{product.shape ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Color</p>
                  <p className="font-medium">{product.color ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Material</p>
                  <p className="font-medium">{product.material ?? "—"}</p>
                </div>
              </div>
            )}
            {product.notes && (
              <div className="border-t pt-3 text-sm text-muted-foreground">
                {product.notes}
              </div>
            )}
          </div>

          {canManage && (
            <StockActions productId={product.id} currentStock={product.stock} />
          )}
        </div>

        <div className="space-y-3 lg:col-span-2">
          <h3 className="text-sm font-semibold">Historial de movimientos</h3>
          <MovementHistory movements={movements} />
        </div>
      </div>
    </div>
  );
}
