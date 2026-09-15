import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  ENTRADA: "Entrada",
  VENTA: "Venta",
  EMBAJADOR: "Embajador",
  GARANTIA: "Garantía",
  AJUSTE: "Ajuste",
};

const TYPE_STYLE: Record<string, string> = {
  ENTRADA: "text-status-good",
  VENTA: "text-chart-1",
  EMBAJADOR: "text-chart-5",
  GARANTIA: "text-chart-8",
  AJUSTE: "text-chart-4",
};

function referenceLink(m: {
  type: string;
  saleId: string | null;
  ambassadorDeliveryId: string | null;
  warrantyId: string | null;
  reference: string | null;
}) {
  if (m.saleId) return `/ventas/${m.saleId}`;
  if (m.ambassadorDeliveryId) return `/embajadores`;
  if (m.warrantyId) return `/garantias`;
  return null;
}

export function MovementHistory({
  movements,
}: {
  movements: {
    id: string;
    type: string;
    quantity: number;
    reason: string | null;
    reference: string | null;
    saleId: string | null;
    ambassadorDeliveryId: string | null;
    warrantyId: string | null;
    createdAt: Date;
    user: { name: string };
  }[];
}) {
  if (movements.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aún no hay movimientos registrados para este producto.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead>Referencia</TableHead>
            <TableHead>Usuario</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((m) => {
            const link = referenceLink(m);
            return (
              <TableRow key={m.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatDateTime(m.createdAt)}
                </TableCell>
                <TableCell>
                  <span className={cn("text-sm font-medium", TYPE_STYLE[m.type])}>
                    {TYPE_LABEL[m.type] ?? m.type}
                  </span>
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-medium tabular-nums",
                    m.quantity > 0 ? "text-status-good" : "text-foreground",
                  )}
                >
                  {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {link ? (
                    <Link href={link} className="hover:underline">
                      {m.reference ?? m.reason ?? "—"}
                    </Link>
                  ) : (
                    m.reference ?? m.reason ?? "—"
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {m.user.name}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
