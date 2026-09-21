import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, AtSign, Gift } from "lucide-react";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getAmbassadors } from "@/server/queries/ambassadors";
import { formatDate, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export default async function AmbassadorsPage() {
  const session = await auth();
  if (!session || !can(session.user.role, "ambassadors:manage")) {
    redirect("/hoy");
  }
  const canManage = true;
  const ambassadors = await getAmbassadors();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Embajadores"
        description={`${ambassadors.length} embajador(es) · ${formatNumber(
          ambassadors.reduce((s, a) => s + a.totalUnits, 0),
        )} lentes entregados en total`}
        actions={
          canManage ? (
            <Button render={<Link href="/embajadores/nuevo" />} nativeButton={false}>
              <Plus className="h-4 w-4" />
              Nuevo embajador
            </Button>
          ) : undefined
        }
      />

      {ambassadors.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          Aún no has registrado embajadores.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ambassadors.map((a) => (
            <Link
              key={a.id}
              href={`/embajadores/${a.id}`}
              className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{a.name}</p>
                  {a.instagram && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <AtSign className="h-3 w-3" /> {a.instagram}
                    </p>
                  )}
                </div>
                <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
                  <Gift className="h-3 w-3" />
                  {a.totalUnits}
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {a.lastDeliveryDate
                  ? `Última entrega: ${formatDate(a.lastDeliveryDate)}`
                  : "Sin entregas registradas"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
