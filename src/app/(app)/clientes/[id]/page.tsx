import { notFound, redirect } from "next/navigation";
import { Phone, MessageCircle, DollarSign, ShoppingBag, CalendarClock, Wallet } from "lucide-react";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getClientById } from "@/server/queries/customers";
import { getSellers } from "@/server/queries/sales";
import { formatCLP, formatDateOnly, formatNumber } from "@/lib/format";
import { formatRut } from "@/lib/rut";
import { formatBirthday } from "@/lib/customers";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { ClientEstadoBadge } from "@/components/customers/client-estado-badge";
import { ClientEditButton } from "@/components/customers/client-edit-button";
import { ActivityFormDialog } from "@/components/customers/activity-form-dialog";
import { ActivityTimeline } from "@/components/customers/activity-timeline";
import { BrandsDonutChart } from "@/components/customers/brands-donut-chart";
import { ClientDetailTabs } from "@/components/customers/client-detail-tabs";
import { ClientCollectionsTab } from "@/components/customers/client-collections-tab";
import { SalesTable } from "@/components/sales/sales-table";

export default async function ClientDetailPage({
  params,
}: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const session = await auth();
  if (!session || !can(session.user.role, "customers:manage")) {
    redirect("/");
  }

  const canViewAll = can(session.user.role, "customers:view-all");
  const canManageCollections = can(session.user.role, "collections:manage");

  const client = await getClientById(id);
  if (!client) notFound();
  // Never disclose that another vendedor's client exists via a redirect —
  // 404 is the non-leaking response here.
  if (!canViewAll && client.assignedSellerId !== session.user.id) notFound();

  const sellers = canViewAll ? await getSellers() : [];
  const birthday = formatBirthday(client.birthdayMonth, client.birthdayDay);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
            <ClientEstadoBadge estado={client.estado} />
          </div>
          <p className="text-sm text-muted-foreground">
            {client.customerSince
              ? `Cliente desde ${formatDateOnly(client.customerSince)}`
              : formatRut(client.rut)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {client.phone && (
            <>
              <Button
                variant="outline"
                render={<a href={`https://wa.me/${client.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" />}
                nativeButton={false}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
              <Button variant="outline" render={<a href={`tel:${client.phone}`} />} nativeButton={false}>
                <Phone className="h-4 w-4" />
                Llamar
              </Button>
            </>
          )}
          <ClientEditButton
            client={{
              id: client.id,
              name: client.name,
              rut: client.rut,
              businessName: client.businessName ?? "",
              city: client.city ?? "",
              contactName: client.contactName ?? "",
              phone: client.phone ?? "",
              email: client.email ?? "",
              birthdayMonth: client.birthdayMonth?.toString() ?? "",
              birthdayDay: client.birthdayDay?.toString() ?? "",
              customerSince: client.customerSince ? client.customerSince.toISOString().slice(0, 10) : "",
              paymentTermsDays: client.paymentTermsDays?.toString() ?? "",
              discountPercent: client.discountPercent ?? 0,
              assignedSellerId: client.assignedSellerId ?? "",
            }}
            canAssignSeller={canViewAll}
            sellers={sellers}
          />
          <ActivityFormDialog customerId={client.id} triggerLabel="Registrar visita" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-2 rounded-xl border bg-card p-4 text-sm lg:col-span-1">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Información general
            </h2>
          </div>
          <dl className="space-y-2">
            <InfoRow label="Razón social" value={client.businessName} />
            <InfoRow label="RUT" value={formatRut(client.rut)} />
            <InfoRow label="Ciudad" value={client.city} />
            <InfoRow label="Dirección" value={client.address} />
            <InfoRow label="Contacto" value={client.contactName} />
            <InfoRow label="Teléfono" value={client.phone} />
            <InfoRow label="Email" value={client.email} />
            <InfoRow label="Cumpleaños" value={birthday} />
            <InfoRow label="Vendedor asignado" value={client.assignedSeller?.name ?? null} />
            <InfoRow
              label="Fecha de ingreso"
              value={client.customerSince ? formatDateOnly(client.customerSince) : null}
            />
            <InfoRow
              label="Condiciones comerciales"
              value={
                client.paymentTermsDays || client.discountPercent
                  ? [
                      client.paymentTermsDays ? `${client.paymentTermsDays} días` : null,
                      client.discountPercent ? `${client.discountPercent}% descuento` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : null
              }
            />
          </dl>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
          <StatCard
            label="Última compra"
            value={client.lastSaleDate ? formatDateOnly(client.lastSaleDate) : "Sin compras"}
            icon={ShoppingBag}
          />
          <StatCard
            label={`Total compras ${new Date().getFullYear()}`}
            value={formatCLP(client.ventaAcumuladaAnual)}
            icon={DollarSign}
            hint={`${formatNumber(client.comprasAnual)} compra(s)`}
          />
          <StatCard
            label="Deuda pendiente"
            value={formatCLP(client.deuda)}
            icon={Wallet}
            tone={client.deuda > 0 ? "critical" : "good"}
            hint={client.deuda > 0 ? undefined : "Al día"}
          />
          <StatCard
            label="Última visita"
            value={client.lastVisitDate ? formatDateOnly(client.lastVisitDate) : "Sin registro"}
            icon={CalendarClock}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Marcas que compra">
          <BrandsDonutChart brands={client.brands} />
        </ChartCard>
        <ChartCard title="Resumen de actividad" description="Histórico completo del cliente">
          <div className="grid grid-cols-2 gap-4">
            <SummaryStat label="Cantidad de ventas" value={formatNumber(client.resumenActividad.cantidadVentas)} />
            <SummaryStat label="Cantidad de armazones" value={formatNumber(client.resumenActividad.cantidadUnidades)} />
            <SummaryStat
              label="Descuento promedio"
              value={`${client.resumenActividad.descuentoPromedio.toFixed(1)}%`}
            />
            <SummaryStat label="Ticket promedio" value={formatCLP(client.resumenActividad.ticketPromedio)} />
          </div>
        </ChartCard>
      </div>

      <ClientDetailTabs
        historial={<SalesTable sales={client.sales} />}
        seguimiento={<ActivityTimeline activities={client.activities} />}
        cobranzas={<ClientCollectionsTab collections={client.collections} canManage={canManageCollections} />}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value || "—"}</dd>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
