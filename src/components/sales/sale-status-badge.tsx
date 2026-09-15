import { cn } from "@/lib/utils";
import { Clock, CheckCircle2, XCircle } from "lucide-react";

export function SaleStatusBadge({
  status,
  cancelled,
}: {
  status: "PENDIENTE_CONFIRMACION" | "CONFIRMADA";
  cancelled?: boolean;
}) {
  if (cancelled) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        <XCircle className="h-3 w-3" />
        Cancelada
      </span>
    );
  }

  const isPending = status === "PENDIENTE_CONFIRMACION";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        isPending
          ? "bg-status-warning/15 text-[#8a5a00]"
          : "bg-status-good/10 text-status-good",
      )}
    >
      {isPending ? <Clock className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
      {isPending ? "Pendiente de confirmación" : "Confirmada · stock descontado"}
    </span>
  );
}
