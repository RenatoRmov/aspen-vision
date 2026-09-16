import { formatCLP, formatDateOnly } from "@/lib/format";
import { parseChecks, formatCheckLabel } from "@/lib/collections";
import { DeletePaymentButton } from "@/components/collections/delete-payment-button";
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
  createdBy: { name: string };
};

export function PaymentsHistoryTable({
  title,
  payments,
  emptyMessage,
}: {
  title: string;
  payments: PaymentHistoryRow[];
  emptyMessage: string;
}) {
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
              <TableHead className="w-10"></TableHead>
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
                  <TableCell>
                    <DeletePaymentButton paymentId={p.id} />
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
