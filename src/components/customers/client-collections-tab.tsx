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
import { CollectionEstadoBadge } from "@/components/collections/collection-estado-badge";
import type { CollectionEstado } from "@/lib/collections";

export type ClientCollectionRow = {
  id: string;
  folio: string;
  documentDate: Date;
  totalAmount: number;
  saldo: number;
  estado: CollectionEstado;
};

/** Read-only for anyone lacking collections:manage — a Vendedor sees exactly
 * how much their own client owes, but has to go through Cobranzas itself
 * (gated separately) to register a payment. */
export function ClientCollectionsTab({
  collections,
  canManage,
}: {
  collections: ClientCollectionRow[];
  canManage: boolean;
}) {
  if (collections.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-muted-foreground">
        Este cliente no tiene documentos en Cobranzas.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Folio</TableHead>
          <TableHead>Fecha Docto</TableHead>
          <TableHead className="text-right">Monto Total</TableHead>
          <TableHead className="text-right">Saldo</TableHead>
          <TableHead>Estado</TableHead>
          {canManage && <TableHead className="w-24"></TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {collections.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium">{c.folio}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDateOnly(c.documentDate)}
            </TableCell>
            <TableCell className="text-right text-sm tabular-nums">{formatCLP(c.totalAmount)}</TableCell>
            <TableCell className="text-right text-sm font-medium tabular-nums">
              {formatCLP(c.saldo)}
            </TableCell>
            <TableCell>
              <CollectionEstadoBadge estado={c.estado} />
            </TableCell>
            {canManage && (
              <TableCell>
                <Link href={`/cobranzas/${c.id}`} className="text-sm text-primary hover:underline">
                  Gestionar
                </Link>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
