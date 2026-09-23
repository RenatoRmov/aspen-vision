import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getWarranties, type WarrantyFilters } from "@/server/queries/warranties";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { WarrantyStatusSelect } from "@/components/warranties/warranty-status-select";
import { DeleteWarrantyButton } from "@/components/warranties/delete-warranty-button";
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

export default async function WarrantiesPage({
  searchParams,
}: PageProps<"/garantias">) {
  const sp = await searchParams;
  const session = await auth();
  if (!session || !can(session.user.role, "warranties:manage")) {
    redirect("/hoy");
  }
  const canManage = true;
  const canDelete = can(session.user.role, "warranties:delete");

  const filters: WarrantyFilters = {
    status: (typeof sp.status === "string" ? sp.status : "all") as WarrantyFilters["status"],
    q: typeof sp.q === "string" ? sp.q : undefined,
  };
  const warranties = await getWarranties(filters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Garantías"
        description={`${warranties.length} caso(s) registrados`}
        actions={
          canManage ? (
            <Button render={<Link href="/garantias/nueva" />} nativeButton={false}>
              <Plus className="h-4 w-4" />
              Nueva garantía
            </Button>
          ) : undefined
        }
      />

      {warranties.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          No hay garantías registradas todavía.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14"></TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warranties.map((w) => {
                const img = primaryImage(w.product.images);
                return (
                  <TableRow key={w.id}>
                    <TableCell>
                      <div className="relative h-9 w-9 overflow-hidden rounded-md bg-muted">
                        {img && (
                          <Image src={img} alt="" fill className="object-cover" sizes="36px" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{w.code}</TableCell>
                    <TableCell className="text-sm">{w.customerName}</TableCell>
                    <TableCell className="text-sm">{w.product.name}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {w.reason}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{w.quantity}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(w.date)}
                    </TableCell>
                    <TableCell>
                      <WarrantyStatusSelect
                        warrantyId={w.id}
                        status={w.status}
                        canManage={canManage}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <PrintPdfButton href={`/api/pdf/garantia/${w.id}`} />
                        {canDelete && <DeleteWarrantyButton warrantyId={w.id} code={w.code} />}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
