import { redirect } from "next/navigation";
import { CalendarClock, AlertTriangle, Clock, DollarSign, Gift, Quote } from "lucide-react";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getTodayData } from "@/server/queries/today";
import { formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { ChartCard } from "@/components/dashboard/chart-card";
import { StatLinkCard } from "@/components/today/stat-link-card";
import { ContactTodayList } from "@/components/today/contact-today-list";
import { AtRiskList } from "@/components/today/at-risk-list";
import { BirthdaysList } from "@/components/today/birthdays-list";
import { PendingCollectionsList } from "@/components/today/pending-collections-list";
import { NextActionsTable } from "@/components/today/next-actions-table";
import { ActivityFormDialog } from "@/components/customers/activity-form-dialog";

const QUOTES = [
  "La constancia en el seguimiento es la clave de las grandes ventas.",
  "Un cliente contactado a tiempo es una venta que no se pierde.",
  "El detalle que recuerdas es el que hace que vuelvan.",
];

function greeting(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default async function HoyPage() {
  const session = await auth();
  if (!session || !can(session.user.role, "customers:manage")) {
    redirect("/");
  }

  const data = await getTodayData(session.user.id, session.user.role);
  const now = new Date();
  const firstName = session.user.name?.split(" ")[0] ?? session.user.name ?? "";
  const dateLabel = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  const quote = QUOTES[now.getDate() % QUOTES.length];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting(now)}, ${firstName}`}
        description={`Aquí tienes tu resumen y las acciones de hoy · ${dateLabel}`}
        actions={<ActivityFormDialog triggerLabel="Registrar visita" />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatLinkCard
          label="Clientes por contactar hoy"
          value={formatNumber(data.contactarHoyCount)}
          icon={CalendarClock}
          href="/clientes?tab=visitar-semana"
        />
        <StatLinkCard
          label="Clientes en riesgo"
          value={formatNumber(data.enRiesgoCount)}
          icon={AlertTriangle}
          hint="Más de 60 días sin comprar"
          tone="critical"
          href="/clientes?tab=EN_RIESGO"
        />
        <StatLinkCard
          label="Clientes con seguimiento"
          value={formatNumber(data.conSeguimientoCount)}
          icon={Clock}
          hint="Entre 30 y 60 días"
          tone="warning"
          href="/clientes?tab=SEGUIMIENTO"
        />
        <StatLinkCard
          label="Clientes con cobranza"
          value={formatNumber(data.conCobranzaCount)}
          icon={DollarSign}
          hint="Pagos pendientes"
          tone="good"
          href="/clientes?tab=con-deuda"
        />
        <StatLinkCard
          label="Clientes de cumpleaños"
          value={formatNumber(data.cumpleanosHoy.length)}
          icon={Gift}
          hint="Hoy"
          href="/clientes"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Clientes que debes contactar hoy" description={`${data.contactarHoyCount} cliente(s)`}>
          <ContactTodayList rows={data.contactarHoy} />
        </ChartCard>
        <ChartCard title="Clientes en riesgo" description={`${data.enRiesgoCount} cliente(s)`}>
          <AtRiskList rows={data.enRiesgo} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Cumpleaños de clientes" description={`${data.cumpleanosHoy.length} cliente(s)`}>
          <BirthdaysList rows={data.cumpleanosHoy} />
        </ChartCard>
        <ChartCard title="Cobranzas pendientes" description={`${data.conCobranzaCount} cliente(s)`}>
          <PendingCollectionsList rows={data.conCobranza} />
        </ChartCard>
      </div>

      <ChartCard title="Próximas acciones" description={`${data.proximasAcciones.length} acción(es)`}>
        <NextActionsTable rows={data.proximasAcciones} />
      </ChartCard>

      <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
        <Quote className="h-5 w-5 shrink-0 text-muted-foreground" />
        <p className="text-sm italic text-muted-foreground">{quote}</p>
      </div>
    </div>
  );
}
