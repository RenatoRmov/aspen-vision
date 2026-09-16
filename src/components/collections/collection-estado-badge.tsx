import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, CircleDollarSign, Timer } from "lucide-react";
import { ESTADO_LABEL, type CollectionEstado } from "@/lib/collections";

const STYLES: Record<CollectionEstado, string> = {
  PAGADA: "bg-status-good/10 text-status-good",
  PENDIENTE: "bg-status-serious/15 text-[#9a4a1e]",
  PARCIAL: "bg-status-warning/15 text-[#8a5a00]",
  A_FAVOR: "bg-primary/10 text-primary",
};

const ICONS: Record<CollectionEstado, typeof CheckCircle2> = {
  PAGADA: CheckCircle2,
  PENDIENTE: Clock,
  PARCIAL: Timer,
  A_FAVOR: CircleDollarSign,
};

export function CollectionEstadoBadge({ estado }: { estado: CollectionEstado }) {
  const Icon = ICONS[estado];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STYLES[estado],
      )}
    >
      <Icon className="h-3 w-3" />
      {ESTADO_LABEL[estado]}
    </span>
  );
}
