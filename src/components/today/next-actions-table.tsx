import Link from "next/link";
import { utcDayDiff } from "@/lib/customers";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateOnly, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export type NextActionRow = {
  customer: { id: string; name: string };
  activity: { id: string; nextAction: string | null; nextActionDate: Date };
};

function relativeLabel(date: Date): { text: string; urgent: boolean } {
  const days = utcDayDiff(date, new Date());
  if (days < 0) return { text: `Atrasado ${formatNumber(Math.abs(days))} día(s)`, urgent: true };
  if (days === 0) return { text: "Hoy", urgent: true };
  if (days === 1) return { text: "Mañana", urgent: false };
  return { text: `En ${formatNumber(days)} días`, urgent: false };
}

export function NextActionsTable({ rows }: { rows: NextActionRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No tienes próximas acciones pendientes.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Acción</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ customer: c, activity: a }) => {
          const rel = relativeLabel(a.nextActionDate);
          return (
            <TableRow key={a.id}>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {formatDateOnly(a.nextActionDate)}
              </TableCell>
              <TableCell>
                <Link href={`/clientes/${c.id}`} className="font-medium hover:underline">
                  {c.name}
                </Link>
              </TableCell>
              <TableCell className="text-sm">{a.nextAction || "—"}</TableCell>
              <TableCell>
                <span
                  className={cn(
                    "text-xs font-medium",
                    rel.urgent ? "text-status-critical" : "text-muted-foreground",
                  )}
                >
                  {rel.text}
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
