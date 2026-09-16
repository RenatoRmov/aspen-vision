import { formatCLP, formatDateOnly } from "@/lib/format";
import { parseChecks, formatCheckLabel, type CollectionPaymentKind } from "@/lib/collections";
import { DeletePaymentButton } from "@/components/collections/delete-payment-button";
import { CollectionPaymentForm } from "@/components/collections/collection-payment-form";
import { AgreementPaidCheckbox } from "@/components/collections/agreement-paid-checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type PaymentHistoryRow = {
  id: string;
  date: Date;
  method: string;
  checks: unknown;
  note: string | null;
  amount: number;
  paid: boolean;
  createdBy: { name: string };
};

export function PaymentsHistoryTable({
  title,
  payments,
  emptyMessage,
  collectionId,
  saldo,
  kind,
}: {
  title: string;
  payments: PaymentHistoryRow[];
  emptyMessage: string;
  collectionId: string;
  saldo: number;
  kind: CollectionPaymentKind;
}) {
  const showPagado = kind === "ACUERDO";

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      {payments.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead>Registrado por</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              {showPagado && <TableHead className="text-center">Pagado</TableHead>}
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => {
              const checks = parseChecks(p.checks);
              return (
                <TableRow key={p.id}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {formatDateOnly(p.date)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.method}
                    {checks.length > 0 && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {checks.map((c) => `${formatCheckLabel(c)}: ${formatCLP(c.amount)}`).join(" · ")}
                      </div>
                    )}
                  </TableCell>
                  <TableCell
                    className="max-w-56 truncate text-sm text-muted-foreground"
                    title={p.note ?? ""}
                  >
                    {p.note || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.createdBy.name}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums">
                    {formatCLP(p.amount)}
                  </TableCell>
                  {showPagado && (
                    <TableCell>
                      <AgreementPaidCheckbox paymentId={p.id} paid={p.paid} />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center justify-end gap-0.5">
                      <CollectionPaymentForm
                        collectionId={collectionId}
                        saldo={saldo}
                        kind={kind}
                        initial={{
                          id: p.id,
                          date: p.date.toISOString().slice(0, 10),
                          amount: p.amount,
                          method: p.method,
                          note: p.note ?? "",
                          checks,
                        }}
                      />
                      <DeletePaymentButton paymentId={p.id} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
