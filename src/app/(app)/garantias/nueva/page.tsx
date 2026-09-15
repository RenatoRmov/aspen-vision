import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { WarrantyForm } from "@/components/warranties/warranty-form";

export default async function NewWarrantyPage() {
  const session = await auth();
  if (!session || !can(session.user.role, "warranties:manage")) redirect("/garantias");

  const users = await db.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nueva garantía"
        description="Registra un caso de garantía y descuenta el producto de reemplazo del inventario"
      />
      <WarrantyForm users={users} currentUserId={session.user.id} />
    </div>
  );
}
