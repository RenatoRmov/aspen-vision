import Link from "next/link";
import { Crown } from "lucide-react";
import { formatCLP, formatNumber } from "@/lib/format";
import { formatRut } from "@/lib/rut";

export function TopDebtorsTable({
  debtors,
}: {
  debtors: { rut: string; name: string; saldo: number; documentos: number }[];
}) {
  if (debtors.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        No hay saldos pendientes — todo al día.
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
            <th className="py-2 pr-2 font-medium">RUT</th>
            <th className="py-2 pr-2 text-right font-medium">Documentos</th>
            <th className="py-2 pl-2 text-right font-medium">Saldo</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {debtors.map((d, i) => (
            <tr key={d.rut}>
              <td className="py-2 pr-2 tabular-nums text-muted-foreground">{i + 1}</td>
              <td className="py-2 pr-2 font-medium">
                <span className="flex items-center gap-1.5">
                  {i === 0 && <Crown className="h-3.5 w-3.5 text-primary" />}
                  {d.name}
                </span>
              </td>
              <td className="py-2 pr-2 whitespace-nowrap text-muted-foreground">
                <Link
                  href={`/cobranzas?rut=${encodeURIComponent(d.rut)}`}
                  className="hover:underline"
                >
                  {formatRut(d.rut)}
                </Link>
              </td>
              <td className="py-2 pr-2 text-right tabular-nums">{formatNumber(d.documentos)}</td>
              <td className="py-2 pl-2 text-right font-medium tabular-nums">
                {formatCLP(d.saldo)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {debtors[0] && (
        <p className="mt-3 rounded-lg bg-accent px-3 py-2 text-xs text-accent-foreground">
          Mayor deudor: <span className="font-semibold">{debtors[0].name}</span> ·{" "}
          {formatCLP(debtors[0].saldo)} pendiente(s)
        </p>
      )}
    </div>
  );
}
