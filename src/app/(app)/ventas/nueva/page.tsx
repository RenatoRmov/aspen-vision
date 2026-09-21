import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getSellers } from "@/server/queries/sales";
import { PageHeader } from "@/components/shared/page-header";
import { SaleForm } from "@/components/sales/sale-form";

export default async function NewSalePage() {
  const session = await auth();
  if (!session || !can(session.user.role, "sales:create")) redirect("/ventas");

  const sellers = session.user.role === "ADMIN" ? await getSellers() : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nueva venta"
        description="Registra los productos vendidos — un preparador confirma antes de descontar inventario"
      />
      <SaleForm
        sellers={sellers}
        isAdmin={session.user.role === "ADMIN"}
        currentUserId={session.user.id}
      />
    </div>
  );
}
