"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatNumber } from "@/lib/format";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

export function BrandsDonutChart({
  brands,
}: {
  brands: { brand: string; qty: number; percent: number }[];
}) {
  if (brands.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Sin compras registradas todavía.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="50%" height={160}>
        <PieChart>
          <Pie
            data={brands}
            dataKey="qty"
            nameKey="brand"
            innerRadius="55%"
            outerRadius="85%"
            strokeWidth={2}
            stroke="var(--card)"
          >
            {brands.map((b, i) => (
              <Cell key={b.brand} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value, name) => [`${formatNumber(Number(value))} unid.`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex-1 space-y-1.5 text-sm">
        {brands.map((b, i) => (
          <li key={b.brand} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 truncate">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="truncate">{b.brand}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{b.percent}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
