import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getCollectionById } from "@/server/queries/collections";
import { formatCLP, formatDateOnly, formatDateTime } from "@/lib/format";
import { formatRut } from "@/lib/rut";
import { PageHeader } from "@/components/shared/page-header";
import { CollectionEstadoBadge } from "@/components/collections/collection-estado-badge";
import { CollectionPaymentForm } from "@/components/collections/collection-payment-form";
import { CollectionRowActions } from "@/components/collections/collection-row-actions";
import { PaymentsHistoryTable } from "@/components/collections/payments-history-table";

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

  const abonos = collection.payments.filter((p) => p.kind === "ABONO");
  const acuerdos = collection.payments.filter((p) => p.kind === "ACUERDO");

  return (
    <div className="space-y-6">
      <PageHeader
        title={collection.folio}
        description={`${collection.businessName} · ${formatRut(collection.clientRut)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <CollectionPaymentForm collectionId={collection.id} saldo={collection.saldo} kind="ABONO" />
            <CollectionPaymentForm collectionId={collection.id} saldo={collection.saldo} kind="ACUERDO" />
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

          <PaymentsHistoryTable
            title="Historial de abonos"
            payments={abonos}
            emptyMessage="Aún no se ha registrado ningún abono."
            collectionId={collection.id}
            saldo={collection.saldo}
            kind="ABONO"
          />

          <PaymentsHistoryTable
            title="Acuerdos comerciales"
            payments={acuerdos}
            emptyMessage="Aún no hay acuerdos de pago registrados."
            collectionId={collection.id}
            saldo={collection.saldo}
            kind="ACUERDO"
          />
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
