import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { AmbassadorForm } from "@/components/ambassadors/ambassador-form";

export default async function NewAmbassadorPage() {
  const session = await auth();
  if (!session || !can(session.user.role, "ambassadors:manage")) redirect("/embajadores");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo embajador"
        description="Registra a un influencer o embajador de marca"
      />
      <AmbassadorForm />
    </div>
  );
}
