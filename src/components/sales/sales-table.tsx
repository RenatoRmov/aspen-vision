import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCLP, formatDateTime } from "@/lib/format";
import { withTax } from "@/lib/sale-totals";
import { SaleStatusBadge } from "./sale-status-badge";
import { DeleteSaleButton } from "./sale-actions";

export function SalesTable({
  sales,
  canDelete = false,
}: {
  sales: {
    id: string;
    code: string;
    date: Date;
    status: "PENDIENTE_CONFIRMACION" | "CONFIRMADA";
    cancelledAt: Date | null;
    customer: { name: string } | null;
    seller: { name: string };
    items: { quantity: number; subtotal: number }[];
  }[];
  canDelete?: boolean;
}) {
  if (sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
        No hay ventas que coincidan con estos filtros.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Vendedor</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Unidades</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Estado</TableHead>
            {canDelete && <TableHead></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((s) => {
            const total = withTax(s.items.reduce((a, i) => a + i.subtotal, 0));
            const units = s.items.reduce((a, i) => a + i.quantity, 0);
            return (
              <TableRow key={s.id}>
                <TableCell>
                  <Link href={`/ventas/${s.id}`} className="font-medium hover:underline">
                    {s.code}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatDateTime(s.date)}
                </TableCell>
                <TableCell className="text-sm">{s.seller.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {s.customer?.name ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{units}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatCLP(total)}
                </TableCell>
                <TableCell>
                  <SaleStatusBadge status={s.status} cancelled={!!s.cancelledAt} />
                </TableCell>
                {canDelete && (
                  <TableCell>
                    <DeleteSaleButton saleId={s.id} variant="icon" />
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
