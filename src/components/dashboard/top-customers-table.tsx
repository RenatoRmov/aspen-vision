import { Crown } from "lucide-react";
import { formatCLP, formatNumber } from "@/lib/format";

export function TopCustomersTable({
  customers,
}: {
  customers: { name: string; orders: number; net: number; withTax: number }[];
}) {
  if (customers.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        Aún no hay ventas asociadas a un cliente en este período.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2 pr-2 font-medium">#</th>
            <th className="py-2 pr-2 font-medium">Cliente</th>
            <th className="py-2 pr-2 text-right font-medium">Órdenes</th>
            <th className="py-2 pr-2 text-right font-medium">Monto neto</th>
            <th className="py-2 pl-2 text-right font-medium">Monto c/IVA</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {customers.map((c, i) => (
            <tr key={c.name + i}>
              <td className="py-2 pr-2 tabular-nums text-muted-foreground">{i + 1}</td>
              <td className="py-2 pr-2 font-medium">
                <span className="flex items-center gap-1.5">
                  {i === 0 && <Crown className="h-3.5 w-3.5 text-primary" />}
                  {c.name}
                </span>
              </td>
              <td className="py-2 pr-2 text-right tabular-nums">{formatNumber(c.orders)}</td>
              <td className="py-2 pr-2 text-right tabular-nums">{formatCLP(c.net)}</td>
              <td className="py-2 pl-2 text-right font-medium tabular-nums">
                {formatCLP(c.withTax)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {customers[0] && (
        <p className="mt-3 rounded-lg bg-accent px-3 py-2 text-xs text-accent-foreground">
          Mejor cliente del período: <span className="font-semibold">{customers[0].name}</span> ·{" "}
          {formatCLP(customers[0].withTax)} en {customers[0].orders} orden(es)
        </p>
      )}
    </div>
  );
}
