"use client";

import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const REPORTS = [
  { key: "ventas", label: "Ventas del período" },
  { key: "movimientos", label: "Movimientos de inventario" },
  { key: "inventario", label: "Inventario actual" },
  { key: "stock-bajo", label: "Productos con stock bajo" },
  { key: "embajadores", label: "Entregas a embajadores" },
  { key: "garantias", label: "Garantías" },
];

export function ExportMenu() {
  const searchParams = useSearchParams();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" className="gap-2" />}>
        <Download className="h-4 w-4" />
        Exportar
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Exportar CSV</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {REPORTS.map((r) => (
          <DropdownMenuItem
            key={r.key}
            render={<a href={`/api/export/${r.key}?${searchParams.toString()}`} />}
          >
            {r.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
