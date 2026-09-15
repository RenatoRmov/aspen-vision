"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatCLP, formatNumber } from "@/lib/format";

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

type CategoryRow = { name: string; qty: number; orders: number; net: number; withTax: number };

export function TopCategories({ categories }: { categories: CategoryRow[] }) {
  if (categories.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        Aún no hay ventas para agrupar por categoría.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={Math.max(160, categories.length * 32)}>
        <BarChart
          data={categories}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
          barCategoryGap={10}
        >
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(v) => formatCLP(v)}
          />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={90}
            tick={{ fontSize: 12, fill: "var(--foreground)" }}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [formatCLP(Number(value)), "Monto c/IVA"]}
          />
          <Bar dataKey="withTax" radius={[0, 4, 4, 0]} maxBarSize={18}>
            {categories.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-2 font-medium">Categoría</th>
              <th className="py-2 pr-2 text-right font-medium">Unidades</th>
              <th className="py-2 pr-2 text-right font-medium">Órdenes</th>
              <th className="py-2 pr-2 text-right font-medium">Monto neto</th>
              <th className="py-2 pl-2 text-right font-medium">Monto c/IVA</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {categories.map((c) => (
              <tr key={c.name}>
                <td className="py-2 pr-2 font-medium">{c.name}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{formatNumber(c.qty)}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{formatNumber(c.orders)}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{formatCLP(c.net)}</td>
                <td className="py-2 pl-2 text-right font-medium tabular-nums">
                  {formatCLP(c.withTax)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
