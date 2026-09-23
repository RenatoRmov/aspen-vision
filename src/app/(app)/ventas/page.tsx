import Link from "next/link";
import { Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { getSales } from "@/server/queries/sales";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { SalesTabs } from "@/components/sales/sales-tabs";
import { SalesTable } from "@/components/sales/sales-table";

export default async function SalesPage({
  searchParams,
}: PageProps<"/ventas">) {
  const sp = await searchParams;
  const session = await auth();
  if (!session) return null;

  const canViewAll = can(session.user.role, "sales:view-all");
  const canCreate = can(session.user.role, "sales:create");
  const canDelete = can(session.user.role, "sales:delete");

  const tab = typeof sp.tab === "string" ? sp.tab : "todas";
  const status = tab === "pendientes" ? "pending" : tab === "confirmadas" ? "confirmed" : "all";

  const [sales, pendingCount] = await Promise.all([
    getSales({
      status,
      sellerId: canViewAll ? undefined : session.user.id,
      q: typeof sp.q === "string" ? sp.q : undefined,
    }),
    db.sale.count({
      where: {
        status: "PENDIENTE_CONFIRMACION",
        ...(canViewAll ? {} : { sellerId: session.user.id }),
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ventas"
        description={
          canViewAll
            ? "Todas las ventas registradas por el equipo"
            : "Tus ventas registradas"
        }
        actions={
          canCreate ? (
            <Button render={<Link href="/ventas/nueva" />} nativeButton={false}>
              <Plus className="h-4 w-4" />
              Nueva venta
            </Button>
          ) : undefined
        }
      />

      <SalesTabs pendingCount={pendingCount} />
      <SalesTable sales={sales} canDelete={canDelete} />
    </div>
  );
}
