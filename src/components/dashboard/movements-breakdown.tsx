import { formatNumber } from "@/lib/format";

const LABELS: Record<string, string> = {
  VENTA: "Ventas",
  EMBAJADOR: "Embajadores",
  GARANTIA: "Garantías",
  AJUSTE: "Ajustes",
};

const COLORS: Record<string, string> = {
  VENTA: "var(--chart-1)",
  EMBAJADOR: "var(--chart-5)",
  GARANTIA: "var(--chart-8)",
  AJUSTE: "var(--chart-4)",
};

export function MovementsBreakdown({
  movementsByType,
}: {
  movementsByType: Record<string, number>;
}) {
  const entradas = movementsByType.ENTRADA ?? 0;
  const outbound = (["VENTA", "EMBAJADOR", "GARANTIA", "AJUSTE"] as const).map((type) => ({
    type,
    label: LABELS[type],
    value: movementsByType[type] ?? 0,
  }));
  const max = Math.max(1, ...outbound.map((o) => o.value));
  const totalOut = outbound.reduce((a, o) => a + o.value, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg bg-status-good/10 px-3 py-2 text-sm">
        <span className="font-medium text-status-good">Entradas de inventario</span>
        <span className="font-semibold tabular-nums text-status-good">
          +{formatNumber(entradas)}
        </span>
      </div>

      <div className="space-y-3">
        {outbound.map((o) => (
          <div key={o.type} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{o.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {formatNumber(o.value)} unid.
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(o.value / max) * 100}%`,
                  backgroundColor: COLORS[o.type],
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {formatNumber(totalOut)} unidades salieron del inventario en el
        período (ventas confirmadas, embajadores, garantías y ajustes).
      </p>
    </div>
  );
}
