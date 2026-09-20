import { cn } from "@/lib/utils";
import { ESTADO_LABEL, ESTADO_DOT_COLOR, type ClientEstado } from "@/lib/customers";

export function ClientEstadoBadge({ estado }: { estado: ClientEstado }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={cn("h-2 w-2 rounded-full", ESTADO_DOT_COLOR[estado])} />
      {ESTADO_LABEL[estado]}
    </span>
  );
}
