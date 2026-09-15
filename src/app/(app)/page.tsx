import {
  DollarSign,
  Glasses,
  PackageX,
  AlertTriangle,
  Receipt,
  Gift,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { resolveRange } from "@/lib/date-range";
import { getDashboardData } from "@/server/queries/dashboard";
import { formatCLP, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { ExportMenu } from "@/components/dashboard/export-menu";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { SalesTrendChart } from "@/components/dashboard/sales-trend-chart";
import { SellersChart } from "@/components/dashboard/sellers-chart";
import { MovementsBreakdown } from "@/components/dashboard/movements-breakdown";
import { LowStockList } from "@/components/dashboard/low-stock-list";
import { PendingSalesList } from "@/components/dashboard/pending-sales-list";
import { TopCustomersTable } from "@/components/dashboard/top-customers-table";
import { TopProductsTable } from "@/components/dashboard/top-products-table";
import { TopCategories } from "@/components/dashboard/top-categories";
import { LeastSoldChart } from "@/components/dashboard/least-sold-chart";

export default async function ResumenPage({
  searchParams,
}: PageProps<"/">) {
  const sp = await searchParams;
  const rangeParam = typeof sp.range === "string" ? sp.range : undefined;
  const fromParam = typeof sp.from === "string" ? sp.from : undefined;
  const toParam = typeof sp.to === "string" ? sp.to : undefined;
  const { key, from, to } = resolveRange(rangeParam, fromParam, toParam);

  const data = await getDashboardData(from, to);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resumen"
        description="Resumen de la operación de Aspen Vision"
        actions={<ExportMenu />}
      />

      <PeriodFilter current={key} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ventas del período"
          value={formatCLP(data.revenue)}
          icon={DollarSign}
          hint={`${formatNumber(data.salesCount)} venta(s) · ${formatCLP(data.revenueWithTax)} c/IVA`}
        />
        <StatCard
          label="Lentes vendidos"
          value={formatNumber(data.unitsSold)}
          icon={Glasses}
          hint="Unidades en el período seleccionado"
        />
        <StatCard
          label="Pedidos por confirmar"
          value={formatNumber(data.pendingSalesTotalCount)}
          icon={Clock}
          tone={data.pendingSalesTotalCount > 0 ? "warning" : "good"}
          hint="Ventas registradas que aún no descuentan inventario"
        />
        <StatCard
          label="Stock total"
          value={formatNumber(data.totalStockUnits)}
          icon={Receipt}
          hint={`${data.lowStockCount} con stock bajo`}
          tone="default"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sin stock"
          value={formatNumber(data.outOfStockCount)}
          icon={PackageX}
          tone={data.outOfStockCount > 0 ? "critical" : "good"}
          hint="Productos activos agotados"
        />
        <StatCard
          label="Stock bajo"
          value={formatNumber(data.lowStockCount)}
          icon={AlertTriangle}
          tone={data.lowStockCount > 0 ? "warning" : "good"}
          hint="Por debajo del mínimo definido"
        />
        <StatCard
          label="Entregados a embajadores"
          value={formatNumber(data.ambassadorUnits)}
          icon={Gift}
          hint="Unidades en el período"
        />
        <StatCard
          label="Unidades en garantía"
          value={formatNumber(data.warrantyUnits)}
          icon={ShieldCheck}
          hint="Unidades en el período"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCard
            title="Ventas por período"
            description="Ingresos por venta, agrupados según el rango seleccionado"
          >
            <SalesTrendChart data={data.salesSeries} />
          </ChartCard>
        </div>
        <ChartCard
          title="Salidas de inventario"
          description="Por qué se movió el stock en el período"
        >
          <MovementsBreakdown movementsByType={data.movementsByType} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Mejor cliente del mes"
          description="Ranking de clientes por monto comprado en el período"
        >
          <TopCustomersTable customers={data.topCustomers} />
        </ChartCard>
        <ChartCard title="Ventas por vendedor" description="Ingresos por vendedor">
          <SellersChart data={data.salesBySeller} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Producto más vendido"
          description="Top por unidades — usa las flechas para ver más"
        >
          <TopProductsTable products={data.topProductsTable} />
        </ChartCard>
        <ChartCard title="Top categorías" description="Categorías con mayor venta">
          <TopCategories categories={data.topCategories} />
        </ChartCard>
      </div>

      <ChartCard
        title="Productos con menor venta"
        description="Los 10 modelos activos con menos unidades vendidas en el período — candidatos a revisar o promocionar"
      >
        <LeastSoldChart data={data.leastSoldProducts} />
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Pedidos pendientes de confirmación"
          description="Requieren revisión antes de descontar inventario"
        >
          <PendingSalesList
            sales={data.pendingSales}
            totalCount={data.pendingSalesTotalCount}
          />
        </ChartCard>
        <ChartCard
          title="Productos con stock bajo"
          description="Prioriza reposición de estos modelos"
        >
          <LowStockList products={data.lowStockProducts} />
        </ChartCard>
      </div>
    </div>
  );
}
