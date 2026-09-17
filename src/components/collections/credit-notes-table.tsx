import { formatCLP, formatDateOnly } from "@/lib/format";
import type { CollectionCreditItem } from "@/lib/collections";
import { DeletePaymentButton } from "@/components/collections/delete-payment-button";
import { CreditNoteForm } from "@/components/collections/credit-note-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type CreditNoteRow = {
  id: string;
  date: Date;
  items: CollectionCreditItem[];
  note: string | null;
  amount: number;
  createdBy: { name: string };
};

export function CreditNotesTable({
  collectionId,
  payments,
}: {
  collectionId: string;
  payments: CreditNoteRow[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-medium">Notas de crédito</h2>
      </div>
      {payments.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">
          Aún no se ha registrado ninguna nota de crédito.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Modelos devueltos</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead>Registrado por</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-sm whitespace-nowrap">
                  {formatDateOnly(p.date)}
                </TableCell>
                <TableCell className="text-sm">
                  <div className="space-y-0.5">
                    {p.items.map((it, i) => (
                      <div key={i} className="text-xs text-muted-foreground">
                        {it.modelo} · {it.cantidad} x {formatCLP(it.valorUnitario)}
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell
                  className="max-w-56 truncate text-sm text-muted-foreground"
                  title={p.note ?? ""}
                >
                  {p.note || "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.createdBy.name}</TableCell>
                <TableCell className="text-right text-sm font-medium tabular-nums">
                  -{formatCLP(p.amount)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-0.5">
                    <CreditNoteForm
                      collectionId={collectionId}
                      initial={{
                        id: p.id,
                        date: p.date.toISOString().slice(0, 10),
                        note: p.note ?? "",
                        items: p.items,
                      }}
                    />
                    <DeletePaymentButton paymentId={p.id} label="nota de crédito" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
