import Link from "next/link";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCLP, formatDateOnly, formatNumber } from "@/lib/format";

export type AtRiskRow = {
  customer: { id: string; name: string; city: string | null; phone: string | null };
  daysSinceLastSale: number | null;
  lastSaleDate: Date | null;
  lastSaleAmount: number;
};

export function AtRiskList({ rows }: { rows: AtRiskRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin clientes en riesgo por ahora.</p>;
  }

  return (
    <ul className="space-y-4">
      {rows.map(({ customer: c, daysSinceLastSale, lastSaleDate, lastSaleAmount }) => (
        <li key={c.id} className="flex items-start justify-between gap-3 border-b pb-4 last:border-0 last:pb-0">
          <div>
            <Link href={`/clientes/${c.id}`} className="font-medium hover:underline">
              {c.name}
            </Link>
            <p className="text-xs text-muted-foreground">{c.city || "—"}</p>
            {daysSinceLastSale !== null && (
              <p className="text-xs font-medium text-status-critical">
                {formatNumber(daysSinceLastSale)} días sin comprar
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {lastSaleDate ? `${formatDateOnly(lastSaleDate)} · ${formatCLP(lastSaleAmount)}` : "—"}
            </p>
          </div>
          {c.phone && (
            <Button size="sm" variant="outline" render={<a href={`tel:${c.phone}`} />} nativeButton={false}>
              <Phone className="h-3.5 w-3.5" />
              Llamar
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
