import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getClients, type ClientFilters } from "@/server/queries/customers";
import { getSellers } from "@/server/queries/sales";
import { PageHeader } from "@/components/shared/page-header";
import { ClientFilters as Filters } from "@/components/customers/client-filters";
import { ClientsTable } from "@/components/customers/clients-table";
import { AddClientButton } from "@/components/customers/add-client-button";

export default async function ClientesPage({
  searchParams,
}: PageProps<"/clientes">) {
  const session = await auth();
  if (!session || !can(session.user.role, "customers:manage")) {
    redirect("/");
  }

  const canViewAll = can(session.user.role, "customers:view-all");
  const sp = await searchParams;
  const tab = (typeof sp.tab === "string" ? sp.tab : "all") as ClientFilters["estado"];
  const q = typeof sp.q === "string" ? sp.q : undefined;

  const [{ rows, counts }, sellers] = await Promise.all([
    getClients({
      assignedSellerId: canViewAll ? undefined : session.user.id,
      estado: tab,
      q,
    }),
    canViewAll ? getSellers() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Gestiona tu cartera de ópticas y haz seguimiento comercial"
        actions={<AddClientButton canAssignSeller={canViewAll} sellers={sellers} />}
      />

      <Filters counts={counts} />
      <ClientsTable rows={rows} canManage />
    </div>
  );
}
