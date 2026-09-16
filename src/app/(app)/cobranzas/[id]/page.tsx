import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getCollectionById } from "@/server/queries/collections";
import { formatCLP, formatDateOnly, formatDateTime } from "@/lib/format";
import { formatRut } from "@/lib/rut";
import { PageHeader } from "@/components/shared/page-header";
import { CollectionEstadoBadge } from "@/components/collections/collection-estado-badge";
import { parseChecks } from "@/lib/collections";
import { CollectionPaymentForm } from "@/components/collections/collection-payment-form";
import { CollectionRowActions } from "@/components/collections/collection-row-actions";
import { DeletePaymentButton } from "@/components/collections/delete-payment-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function CollectionDetailPage({
  params,
}: PageProps<"/cobranzas/[id]">) {
  const { id } = await params;
  const session = await auth();
  if (!session || !can(session.user.role, "collections:manage")) {
    redirect("/");
  }

  const collection = await getCollectionById(id);
  if (!collection) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={collection.folio}
        description={`${collection.businessName} · ${formatRut(collection.clientRut)}`}
        actions={
          <div className="flex gap-2">
            <CollectionPaymentForm collectionId={collection.id} saldo={collection.saldo} />
            <CollectionRowActions collection={collection} redirectAfterDeleteTo="/cobranzas" />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border bg-card p-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Ciudad</p>
                <p className="font-medium">{collection.city || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha Docto</p>
                <p className="font-medium">{formatDateOnly(collection.documentDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado</p>
                <CollectionEstadoBadge estado={collection.estado} />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-medium">Historial de abonos</h2>
            </div>
            {collection.payments.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                Aún no se ha registrado ningún abono.
              </p>
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
                  {collection.payments.map((p) => {
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
                            {checks.map((c) => `${c.label}: ${formatCLP(c.amount)}`).join(" · ")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-56 truncate text-sm text-muted-foreground" title={p.note ?? ""}>
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
        </div>

        <div className="space-y-3 rounded-xl border bg-card p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monto Neto</span>
            <span className="font-medium tabular-nums">{formatCLP(collection.netAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monto IVA</span>
            <span className="font-medium tabular-nums">{formatCLP(collection.taxAmount)}</span>
          </div>
          <div className="flex justify-between border-t pt-3">
            <span className="text-muted-foreground">Monto Total</span>
            <span className="font-medium tabular-nums">{formatCLP(collection.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Abonado</span>
            <span className="font-medium tabular-nums">{formatCLP(collection.totalPaid)}</span>
          </div>
          <div className="flex justify-between border-t pt-3">
            <span className="font-medium">Saldo</span>
            <span className="text-lg font-semibold tabular-nums">
              {formatCLP(collection.saldo)}
            </span>
          </div>
          <p className="border-t pt-3 text-xs text-muted-foreground">
            Documento creado {formatDateTime(collection.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
