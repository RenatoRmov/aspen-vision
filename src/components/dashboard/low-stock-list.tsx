import Link from "next/link";
import Image from "next/image";
import { AlertTriangle } from "lucide-react";
import { StockBadge } from "@/components/shared/stock-badge";

export function LowStockList({
  products,
}: {
  products: {
    id: string;
    name: string;
    brand: string;
    model: string;
    stock: number;
    imageUrl: string | null;
  }[];
}) {
  if (products.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <AlertTriangle className="h-5 w-5 text-status-good" />
        Todo el inventario está en niveles saludables.
      </div>
    );
  }

  return (
    <ul className="divide-y">
      {products.map((p) => (
        <li key={p.id}>
          <Link
            href={`/inventario/${p.id}`}
            className="flex items-center gap-3 py-2.5 text-sm hover:opacity-80"
          >
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
              {p.imageUrl && (
                <Image src={p.imageUrl} alt="" fill className="object-cover" sizes="36px" />
              )}
            </div>
            <span className="flex-1 truncate font-medium">{p.name || `${p.brand} ${p.model}`}</span>
            <StockBadge stock={p.stock} compact />
          </Link>
        </li>
      ))}
    </ul>
  );
}
