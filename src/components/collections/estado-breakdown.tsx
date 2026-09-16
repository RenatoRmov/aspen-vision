import { formatNumber } from "@/lib/format";
import { ESTADO_LABEL, type CollectionEstado } from "@/lib/collections";

const ORDER: CollectionEstado[] = ["PENDIENTE", "PARCIAL", "PAGADA", "A_FAVOR"];

const COLORS: Record<CollectionEstado, string> = {
  PENDIENTE: "var(--status-serious)",
  PARCIAL: "var(--status-warning)",
  PAGADA: "var(--status-good)",
  A_FAVOR: "var(--primary)",
};

export function EstadoBreakdown({
  countByEstado,
}: {
  countByEstado: Record<CollectionEstado, number>;
}) {
  const total = ORDER.reduce((s, k) => s + countByEstado[k], 0);
  const max = Math.max(1, ...ORDER.map((k) => countByEstado[k]));

  if (total === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        Aún no hay cobranzas registradas.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {ORDER.map((key) => (
        <div key={key} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">{ESTADO_LABEL[key]}</span>
            <span className="tabular-nums text-muted-foreground">
              {formatNumber(countByEstado[key])} documento(s)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(countByEstado[key] / max) * 100}%`,
                backgroundColor: COLORS[key],
              }}
            />
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        {formatNumber(total)} documento(s) en total.
      </p>
    </div>
  );
}
