import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getCollections } from "@/server/queries/collections";
import { formatCLP } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { CollectionsTable } from "@/components/collections/collections-table";
import { ImportCollectionsDialog } from "@/components/collections/import-collections-dialog";
import { AddCollectionButton } from "@/components/collections/add-collection-button";

export default async function CobranzasPage() {
  const session = await auth();
  if (!session || !can(session.user.role, "collections:manage")) {
    redirect("/");
  }

  const rows = await getCollections();
  const pendingBalance = rows.reduce((s, r) => s + (r.saldo > 0 ? r.saldo : 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cobranzas"
        description={`${rows.length} documento(s) · Saldo pendiente total: ${formatCLP(pendingBalance)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <ImportCollectionsDialog />
            <AddCollectionButton />
          </div>
        }
      />

      <CollectionsTable rows={rows} />
    </div>
  );
}
