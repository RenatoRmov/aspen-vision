import Link from "next/link";
import { formatCLP, formatNumber } from "@/lib/format";
import { utcDayDiff } from "@/lib/customers";
import { cn } from "@/lib/utils";

export type PendingCollectionRow = {
  customer: { id: string; name: string; city: string | null };
  deuda: number;
  soonestDueDate: Date | null;
};

function dueLabel(dueDate: Date | null): { text: string; overdue: boolean } | null {
  if (!dueDate) return null;
  const days = utcDayDiff(dueDate, new Date());
  if (days < 0) return { text: `Vencido hace ${formatNumber(Math.abs(days))} día(s)`, overdue: true };
  if (days === 0) return { text: "Vence hoy", overdue: true };
  return { text: `Vence en ${formatNumber(days)} día(s)`, overdue: false };
}

export function PendingCollectionsList({ rows }: { rows: PendingCollectionRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay clientes con cobranzas pendientes.</p>;
  }

  return (
    <ul className="space-y-3">
      {rows.map(({ customer: c, deuda, soonestDueDate }) => {
        const due = dueLabel(soonestDueDate);
        return (
          <li key={c.id} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-muted-foreground">
                {c.city || "—"} · Facturas por {formatCLP(deuda)}
              </p>
              {due && (
                <p
                  className={cn(
                    "text-xs font-medium",
                    due.overdue ? "text-status-critical" : "text-[#8a5a00]",
                  )}
                >
                  {due.text}
                </p>
              )}
            </div>
            <Link href={`/clientes/${c.id}`} className="shrink-0 text-sm text-primary hover:underline">
              Ver cobranza
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
