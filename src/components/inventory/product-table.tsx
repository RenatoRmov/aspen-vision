import Link from "next/link";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StockBadge } from "@/components/shared/stock-badge";
import { primaryImage } from "@/lib/product-images";
import type { Prisma } from "@/generated/prisma/client";

type ProductRow = {
  id: string;
  name: string;
  brand: string;
  model: string;
  barcode: string;
  stock: number;
  images: Prisma.JsonValue;
  active: boolean;
  category: { name: string };
};

/**
 * Fixed-format inventory table: Nombre · Categoría · Modelo · Stock Total ·
 * Código de barras — the columns stay in this order everywhere the table is
 * used, per the requested layout.
 */
export function ProductTable({ products }: { products: ProductRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14"></TableHead>
            <TableHead>Nombre producto</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Modelo</TableHead>
            <TableHead className="text-right">Stock Total</TableHead>
            <TableHead>Código de barras</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => {
            const img = primaryImage(p.images);
            return (
              <TableRow key={p.id}>
                <TableCell>
                  <Link href={`/inventario/${p.id}`}>
                    <div className="relative h-10 w-10 overflow-hidden rounded-md bg-muted">
                      {img && (
                        <Image src={img} alt="" fill className="object-cover" sizes="40px" />
                      )}
                    </div>
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/inventario/${p.id}`} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                  {!p.active && (
                    <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      Inactivo
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{p.category.name}</TableCell>
                <TableCell className="text-sm">{p.model}</TableCell>
                <TableCell className="text-right">
                  <StockBadge stock={p.stock} />
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {p.barcode}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
