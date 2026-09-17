import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCLP, formatDateOnly } from "@/lib/format";
import { formatRut } from "@/lib/rut";
import { CollectionEstadoBadge } from "@/components/collections/collection-estado-badge";
import { CollectionRowActions } from "@/components/collections/collection-row-actions";
import type { CollectionEstado } from "@/lib/collections";

export type CollectionRow = {
  id: string;
  city: string;
  clientRut: string;
  businessName: string;
  folio: string;
  documentDate: Date;
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
  totalCreditNotes: number;
  totalPaid: number;
  saldo: number;
  estado: CollectionEstado;
};

export function CollectionsTable({ rows }: { rows: CollectionRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
        No hay cobranzas registradas todavía. Importa un Excel del SII o agrega una manualmente.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ciudad</TableHead>
            <TableHead>Rut Cliente</TableHead>
            <TableHead>Razón Social</TableHead>
            <TableHead>Folio</TableHead>
            <TableHead>Fecha Docto</TableHead>
            <TableHead className="text-right">Monto Neto</TableHead>
            <TableHead className="text-right">Monto IVA</TableHead>
            <TableHead className="text-right">Monto Total</TableHead>
            <TableHead className="text-right">Nota Crédito</TableHead>
            <TableHead className="text-right">Total Abonado</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="text-sm">{c.city || "—"}</TableCell>
              <TableCell className="text-sm whitespace-nowrap">{formatRut(c.clientRut)}</TableCell>
              <TableCell className="max-w-56 truncate text-sm" title={c.businessName}>
                {c.businessName}
              </TableCell>
              <TableCell>
                <Link href={`/cobranzas/${c.id}`} className="font-medium hover:underline">
                  {c.folio}
                </Link>
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {formatDateOnly(c.documentDate)}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                {formatCLP(c.netAmount)}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                {formatCLP(c.taxAmount)}
              </TableCell>
              <TableCell className="text-right text-sm font-medium tabular-nums">
                {formatCLP(c.totalAmount)}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                {c.totalCreditNotes > 0 ? `-${formatCLP(c.totalCreditNotes)}` : "—"}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {formatCLP(c.totalPaid)}
              </TableCell>
              <TableCell className="text-right text-sm font-medium tabular-nums">
                {formatCLP(c.saldo)}
              </TableCell>
              <TableCell>
                <CollectionEstadoBadge estado={c.estado} />
              </TableCell>
              <TableCell>
                <CollectionRowActions collection={c} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
