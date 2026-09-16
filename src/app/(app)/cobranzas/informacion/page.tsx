import { redirect } from "next/navigation";
import { DollarSign, FileText, Clock, CheckCircle2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getCollectionsInfo } from "@/server/queries/collections";
import { formatCLP, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { TopDebtorsTable } from "@/components/collections/top-debtors-table";
import { EstadoBreakdown } from "@/components/collections/estado-breakdown";
import { CollectionsTrendChart } from "@/components/collections/collections-trend-chart";

export default async function InformacionCobranzasPage() {
  const session = await auth();
  if (!session || !can(session.user.role, "collections:manage")) {
    redirect("/");
  }

  const data = await getCollectionsInfo();
  const pendingCount = data.countByEstado.PENDIENTE + data.countByEstado.PARCIAL;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Información Cobranzas"
        description="Resumen de la operación de cobranzas — solo datos de esta pestaña"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total facturado"
          value={formatCLP(data.totalInvoiced)}
          icon={FileText}
          hint={`${formatNumber(data.totalDocuments)} documento(s)`}
        />
        <StatCard
          label="Total cobrado"
          value={formatCLP(data.totalCollected)}
          icon={CheckCircle2}
          tone="good"
          hint={`${formatNumber(data.countByEstado.PAGADA)} documento(s) pagados`}
        />
        <StatCard
          label="Saldo pendiente"
          value={formatCLP(data.totalPending)}
          icon={DollarSign}
          tone={data.totalPending > 0 ? "warning" : "good"}
          hint="Suma de saldos por cobrar"
        />
        <StatCard
          label="Documentos por cobrar"
          value={formatNumber(pendingCount)}
          icon={Clock}
          tone={pendingCount > 0 ? "warning" : "good"}
          hint="Pendientes o con abono parcial"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Quiénes deben más"
          description="Ranking de clientes por saldo pendiente"
        >
          <TopDebtorsTable debtors={data.topDebtors} />
        </ChartCard>
        <ChartCard title="Estado de las cobranzas" description="Documentos por estado">
          <EstadoBreakdown countByEstado={data.countByEstado} />
        </ChartCard>
      </div>

      <ChartCard
        title="Cobros recibidos"
        description="Abonos registrados en los últimos 6 meses"
      >
        <CollectionsTrendChart data={data.collectionsTrend} />
      </ChartCard>
    </div>
  );
}
