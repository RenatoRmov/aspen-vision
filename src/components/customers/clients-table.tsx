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
import { ClientEstadoBadge } from "@/components/customers/client-estado-badge";
import { ClientRowActions } from "@/components/customers/client-row-actions";
import type { ClientEstado } from "@/lib/customers";

export type ClientRow = {
  id: string;
  name: string;
  businessName: string | null;
  rut: string;
  city: string | null;
  lastSaleDate: Date | null;
  lastVisitDate: Date | null;
  ventaAcumulada: number;
  proximoContacto: Date | null;
  deuda: number;
  assignedSellerName: string | null;
  estado: ClientEstado;
};

export function ClientsTable({ rows, canManage }: { rows: ClientRow[]; canManage: boolean }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
        No hay clientes que coincidan con este filtro.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Estado</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Ciudad</TableHead>
            <TableHead>Última compra</TableHead>
            <TableHead>Última visita</TableHead>
            <TableHead className="text-right">Venta acumulada</TableHead>
            <TableHead>Próximo contacto</TableHead>
            <TableHead className="text-right">Deuda</TableHead>
            <TableHead>Vendedor</TableHead>
            {canManage && <TableHead className="w-16"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <ClientEstadoBadge estado={c.estado} />
              </TableCell>
              <TableCell>
                <Link href={`/clientes/${c.id}`} className="font-medium hover:underline">
                  {c.name}
                </Link>
                <p className="text-xs text-muted-foreground">{formatRut(c.rut)}</p>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{c.city || "—"}</TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {c.lastSaleDate ? formatDateOnly(c.lastSaleDate) : "—"}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {c.lastVisitDate ? formatDateOnly(c.lastVisitDate) : "—"}
              </TableCell>
              <TableCell className="text-right text-sm font-medium tabular-nums">
                {formatCLP(c.ventaAcumulada)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {c.proximoContacto ? formatDateOnly(c.proximoContacto) : "—"}
              </TableCell>
              <TableCell className="text-right text-sm font-medium tabular-nums">
                {c.deuda > 0 ? (
                  <span className="text-status-critical">{formatCLP(c.deuda)}</span>
                ) : (
                  formatCLP(0)
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {c.assignedSellerName || "—"}
              </TableCell>
              {canManage && (
                <TableCell>
                  <ClientRowActions clientId={c.id} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
