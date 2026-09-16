import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getCollections, type CollectionFilters } from "@/server/queries/collections";
import { formatCLP } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { CollectionsTable } from "@/components/collections/collections-table";
import { CollectionsFilters } from "@/components/collections/collections-filters";
import { ImportCollectionsDialog } from "@/components/collections/import-collections-dialog";
import { AddCollectionButton } from "@/components/collections/add-collection-button";
import { ExportCobranzasPdfButton } from "@/components/collections/export-cobranzas-pdf-button";

export default async function CobranzasPage({
  searchParams,
}: PageProps<"/cobranzas">) {
  const session = await auth();
  if (!session || !can(session.user.role, "collections:manage")) {
    redirect("/");
  }

  const sp = await searchParams;
  const filters: CollectionFilters = {
    estado: (typeof sp.estado === "string" ? sp.estado : "all") as CollectionFilters["estado"],
    clientRut: typeof sp.rut === "string" ? sp.rut : undefined,
    folio: typeof sp.folio === "string" ? sp.folio : undefined,
    from: typeof sp.from === "string" ? sp.from : undefined,
    to: typeof sp.to === "string" ? sp.to : undefined,
  };

  const rows = await getCollections(filters);
  const pendingBalance = rows.reduce((s, r) => s + (r.saldo > 0 ? r.saldo : 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cobranzas"
        description={`${rows.length} documento(s) · Saldo pendiente total: ${formatCLP(pendingBalance)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportCobranzasPdfButton />
            <ImportCollectionsDialog />
            <AddCollectionButton />
          </div>
        }
      />

      <CollectionsFilters />

      <CollectionsTable rows={rows} />
    </div>
  );
}
