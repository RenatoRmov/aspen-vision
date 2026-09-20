import Link from "next/link";
import { Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientEstadoBadge } from "@/components/customers/client-estado-badge";
import { formatCLP, formatDateOnly } from "@/lib/format";
import type { ClientEstado } from "@/lib/customers";

export type ContactTodayRow = {
  customer: { id: string; name: string; city: string | null; phone: string | null };
  estado: ClientEstado;
  lastSaleDate: Date | null;
  lastSaleAmount: number;
  activity: { nextAction: string | null };
};

export function ContactTodayList({ rows }: { rows: ContactTodayRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No tienes clientes por contactar hoy.</p>;
  }

  return (
    <ul className="space-y-4">
      {rows.map(({ customer: c, estado, lastSaleDate, lastSaleAmount, activity }) => (
        <li key={c.id} className="space-y-2 border-b pb-4 last:border-0 last:pb-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link href={`/clientes/${c.id}`} className="font-medium hover:underline">
                {c.name}
              </Link>
              <p className="text-xs text-muted-foreground">{c.city || "—"}</p>
            </div>
            <ClientEstadoBadge estado={estado} />
          </div>
          <p className="text-xs text-muted-foreground">
            Última compra: {lastSaleDate ? `${formatDateOnly(lastSaleDate)} · ${formatCLP(lastSaleAmount)}` : "—"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium">Hoy</span>
            {c.phone && (
              <>
                <Button size="sm" variant="outline" render={<a href={`tel:${c.phone}`} />} nativeButton={false}>
                  <Phone className="h-3.5 w-3.5" />
                  Llamar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  render={<a href={`https://wa.me/${c.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" />}
                  nativeButton={false}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </Button>
              </>
            )}
          </div>
          {activity.nextAction && (
            <span className="inline-block rounded-md bg-status-warning/15 px-2 py-1 text-xs font-medium text-[#8a5a00]">
              {activity.nextAction}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
