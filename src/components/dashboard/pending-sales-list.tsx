import Link from "next/link";
import { Clock } from "lucide-react";
import { formatCLP, formatDateTime } from "@/lib/format";

export function PendingSalesList({
  sales,
  totalCount,
}: {
  sales: {
    id: string;
    code: string;
    date: Date;
    sellerName: string;
    total: number;
    units: number;
  }[];
  totalCount: number;
}) {
  if (sales.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <Clock className="h-5 w-5 text-status-good" />
        No hay pedidos esperando confirmación.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y">
        {sales.map((s) => (
          <li key={s.id}>
            <Link
              href={`/ventas/${s.id}`}
              className="flex items-center justify-between gap-3 py-2.5 text-sm hover:opacity-80"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {s.code} · {s.sellerName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDateTime(s.date)} · {s.units} lente(s)
                </p>
              </div>
              <span className="shrink-0 font-medium tabular-nums">
                {formatCLP(s.total)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/ventas?tab=pendientes"
        className="block text-center text-sm font-medium text-primary hover:underline"
      >
        Ver los {totalCount >= 6 ? `${totalCount}+` : totalCount} pedidos pendientes
      </Link>
    </div>
  );
}
