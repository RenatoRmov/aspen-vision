import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { AtSign, Music2, Mail, Phone } from "lucide-react";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getAmbassadorWithHistory } from "@/server/queries/ambassadors";
import { formatDateTime, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { DeliveryDialog } from "@/components/ambassadors/delivery-dialog";
import { DeleteAmbassadorButton } from "@/components/ambassadors/delete-ambassador-button";
import { PrintPdfButton } from "@/components/shared/print-pdf-button";
import { primaryImage } from "@/lib/product-images";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AmbassadorDetailPage({
  params,
}: PageProps<"/embajadores/[id]">) {
  const { id } = await params;
  const session = await auth();
  if (!session || !can(session.user.role, "ambassadors:manage")) {
    redirect("/hoy");
  }

  const data = await getAmbassadorWithHistory(id);
  if (!data) notFound();
  const { ambassador, totalUnits } = data;
  const canManage = true;
  const canDelete = can(session.user.role, "ambassadors:delete");

  return (
    <div className="space-y-6">
      <PageHeader
        title={ambassador.name}
        description={`${formatNumber(totalUnits)} lente(s) entregados en total`}
        actions={
          <div className="flex gap-2">
            {canManage && <DeliveryDialog ambassadorId={ambassador.id} />}
            {canDelete && (
              <DeleteAmbassadorButton
                ambassadorId={ambassador.id}
                name={ambassador.name}
                deliveryCount={ambassador.deliveries.length}
              />
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 rounded-xl border bg-card p-4 text-sm">
          {ambassador.instagram && (
            <p className="flex items-center gap-2">
              <AtSign className="h-4 w-4 text-muted-foreground" /> {ambassador.instagram}
            </p>
          )}
          {ambassador.tiktok && (
            <p className="flex items-center gap-2">
              <Music2 className="h-4 w-4 text-muted-foreground" /> {ambassador.tiktok}
            </p>
          )}
          {ambassador.email && (
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" /> {ambassador.email}
            </p>
          )}
          {ambassador.phone && (
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" /> {ambassador.phone}
            </p>
          )}
          {ambassador.notes && (
            <p className="border-t pt-3 text-muted-foreground">{ambassador.notes}</p>
          )}
          {!ambassador.instagram &&
            !ambassador.tiktok &&
            !ambassador.email &&
            !ambassador.phone &&
            !ambassador.notes && (
              <p className="text-muted-foreground">Sin información de contacto.</p>
            )}
        </div>

        <div className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold">Historial de entregas</h3>
          {ambassador.deliveries.length === 0 ? (
            <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
              Aún no se han registrado entregas.
            </p>
          ) : (
            <div className="space-y-4">
              {ambassador.deliveries.map((d) => (
                <div key={d.id} className="overflow-hidden rounded-xl border bg-card">
                  <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5 text-sm">
                    <span className="font-medium">{d.code}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">
                        {formatDateTime(d.date)} · {d.deliveredBy.name}
                      </span>
                      <PrintPdfButton href={`/api/pdf/embajador/${d.id}`} />
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14"></TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="relative h-9 w-9 overflow-hidden rounded-md bg-muted">
                              {primaryImage(item.product.images) && (
                                <Image
                                  src={primaryImage(item.product.images)!}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="36px"
                                />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{item.product.name}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {item.quantity}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {d.notes && (
                    <p className="border-t px-4 py-2 text-xs text-muted-foreground">
                      {d.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
