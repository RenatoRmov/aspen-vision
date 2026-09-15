import { cn } from "@/lib/utils";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";

export function stockLevel(stock: number, minStock: number = LOW_STOCK_THRESHOLD) {
  if (stock <= 0) return "out" as const;
  if (stock <= minStock) return "low" as const;
  return "ok" as const;
}

const LEVEL_STYLE = {
  out: "bg-status-critical/10 text-status-critical",
  low: "bg-status-warning/15 text-[#8a5a00]",
  ok: "bg-status-good/10 text-status-good",
};

const LEVEL_LABEL = {
  out: "Sin stock",
  low: "Stock bajo",
  ok: "Disponible",
};

export function StockBadge({
  stock,
  minStock = LOW_STOCK_THRESHOLD,
  compact = false,
}: {
  stock: number;
  minStock?: number;
  compact?: boolean;
}) {
  const level = stockLevel(stock, minStock);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
        LEVEL_STYLE[level],
      )}
    >
      {compact ? stock : `${stock} · ${LEVEL_LABEL[level]}`}
    </span>
  );
}
