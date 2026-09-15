"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCLP, formatNumber } from "@/lib/format";

const PAGE_SIZE = 10;

export function TopProductsTable({
  products,
}: {
  products: { name: string; qty: number; orders: number; net: number; withTax: number }[];
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const pageItems = products.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const maxQty = Math.max(1, ...products.map((p) => p.qty));

  if (products.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        Aún no hay ventas registradas en este período.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-2 font-medium">#</th>
              <th className="py-2 pr-2 font-medium">Producto</th>
              <th className="py-2 pr-2 text-right font-medium">Unidades</th>
              <th className="py-2 pr-2 text-right font-medium">Monto neto</th>
              <th className="py-2 pl-2 text-right font-medium">Monto c/IVA</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pageItems.map((p, i) => (
              <tr key={p.name + i}>
                <td className="py-2 pr-2 tabular-nums text-muted-foreground">
                  {page * PAGE_SIZE + i + 1}
                </td>
                <td className="py-2 pr-2">
                  <p className="font-medium">{p.name}</p>
                  <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-chart-1"
                      style={{ width: `${(p.qty / maxQty) * 100}%` }}
                    />
                  </div>
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">{formatNumber(p.qty)}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{formatCLP(p.net)}</td>
                <td className="py-2 pl-2 text-right font-medium tabular-nums">
                  {formatCLP(p.withTax)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {page * PAGE_SIZE + 1}–{Math.min(products.length, (page + 1) * PAGE_SIZE)} de{" "}
            {products.length}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
