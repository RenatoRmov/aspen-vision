"use client";

import { useSearchParams } from "next/navigation";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InventoryExportMenu() {
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        render={<a href={`/api/export/inventario-excel?${query}`} target="_blank" rel="noreferrer" />}
        nativeButton={false}
      >
        <FileSpreadsheet className="h-4 w-4" />
        Excel
      </Button>
      <Button
        variant="outline"
        render={<a href={`/api/export/inventario-pdf?${query}`} target="_blank" rel="noreferrer" />}
        nativeButton={false}
      >
        <FileText className="h-4 w-4" />
        PDF
      </Button>
    </div>
  );
}
