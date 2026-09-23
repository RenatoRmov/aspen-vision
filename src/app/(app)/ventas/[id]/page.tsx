import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getSaleById } from "@/server/queries/sales";
import { formatCLP, formatDateTime } from "@/lib/format";
import { primaryImage } from "@/lib/product-images";
import { formatRut } from "@/lib/rut";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { SaleStatusBadge } from "@/components/sales/sale-status-badge";
import {
  ConfirmSaleButton,
  CancelSaleButton,
  DeleteSaleButton,
} from "@/components/sales/sale-actions";
import { PrintPdfButton } from "@/components/shared/print-pdf-button";
import { taxOf } from "@/lib/sale-totals";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function SaleDetailPage({
  params,
}: PageProps<"/ventas/[id]">) {
  const { id } = await params;
  const sale = await getSaleById(id);
  if (!sale) notFound();

  const session = await auth();
  if (!session) return null;

  const canConfirm =
    can(session.user.role, "sales:confirm") &&
    sale.status === "PENDIENTE_CONFIRMACION" &&
    !sale.cancelledAt;
  const canCancel = can(session.user.role, "sales:cancel") && !sale.cancelledAt;
  const canEdit = can(session.user.role, "sales:edit") && !sale.cancelledAt;
  const canDelete = can(session.user.role, "sales:delete");

  const hasDiscount = sale.items.some((i) => i.discountAmount > 0);
  const subtotal = sale.items.reduce((a, i) => a + i.subtotal, 0);
  // IVA is computed once for the whole sale, not per line — see
  // src/lib/sale-totals.ts. Each line below shows the price the customer is
  // paying for it; IVA only ever appears once, in the summary underneath.
  const taxAmount = taxOf(subtotal);
  const total = subtotal + taxAmount;
  const totalDiscount = sale.items.reduce((a, i) => a + i.discountAmount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={sale.code}
        description={`${formatDateTime(sale.date)} · Vendedor: ${sale.seller.name}`}
        actions={
          <div className="flex gap-2">
            <PrintPdfButton href={`/api/pdf/venta/${sale.id}`} />
            {canEdit && (
              <Button
                variant="outline"
                render={<Link href={`/ventas/${sale.id}/editar`} />}
                nativeButton={false}
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            )}
            {canConfirm && <ConfirmSaleButton saleId={sale.id} />}
            {canCancel && <CancelSaleButton saleId={sale.id} />}
            {canDelete && <DeleteSaleButton saleId={sale.id} />}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SaleStatusBadge status={sale.status} cancelled={!!sale.cancelledAt} />
      </div>

      {sale.cancelledAt && (
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Venta cancelada</p>
          <p>{sale.cancelReason}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead className="w-14"></TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">P. unitario</TableHead>
                  {hasDiscount && <TableHead className="text-right">Desc.</TableHead>}
                  <TableHead className="text-right">Precio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.map((item, idx) => {
                  const img = primaryImage(item.product.images);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="relative h-10 w-10 overflow-hidden rounded-md bg-muted">
                          {img && (
                            <Image src={img} alt="" fill className="object-cover" sizes="40px" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">{item.product.barcode}</p>
                        {item.notes && (
                          <p className="mt-0.5 text-xs italic text-muted-foreground">
                            {item.notes}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCLP(item.unitPrice)}
                      </TableCell>
                      {hasDiscount && (
                        <TableCell className="text-right tabular-nums text-status-good">
                          {item.discountAmount > 0
                            ? `-${item.discountPercent % 1 === 0 ? item.discountPercent : item.discountPercent.toFixed(1)}%`
                            : "—"}
                        </TableCell>
                      )}
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCLP(item.subtotal)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="space-y-1 border-t bg-muted/40 px-4 py-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCLP(subtotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex items-center justify-between text-sm text-status-good">
                  <span>Descuentos</span>
                  <span>-{formatCLP(totalDiscount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>IVA (19%)</span>
                <span>{formatCLP(taxAmount)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-1">
                <span className="font-medium">Total</span>
                <span className="text-lg font-semibold tabular-nums">{formatCLP(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border bg-card p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cliente</span>
            <span className="font-medium">{sale.customer?.name ?? "—"}</span>
          </div>
          {sale.customer?.rut && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">RUT</span>
              <span className="font-medium">{formatRut(sale.customer.rut)}</span>
            </div>
          )}
          {sale.customer?.businessName && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Razón social</span>
              <span className="font-medium">{sale.customer.businessName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Método de pago</span>
            <span className="font-medium">{sale.paymentMethod ?? "—"}</span>
          </div>
          {sale.confirmedBy && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Confirmado por</span>
              <span className="font-medium">{sale.confirmedBy.name}</span>
            </div>
          )}
          {sale.confirmedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fecha de confirmación</span>
              <span className="font-medium">{formatDateTime(sale.confirmedAt)}</span>
            </div>
          )}
          {sale.notes && (
            <div className="border-t pt-3 text-muted-foreground">{sale.notes}</div>
          )}
        </div>
      </div>
    </div>
  );
}
