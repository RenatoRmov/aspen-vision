import Link from "next/link";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InventoryExportMenu() {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        render={<Link href="/api/export/inventario-excel" />}
        nativeButton={false}
      >
        <FileSpreadsheet className="h-4 w-4" />
        Excel
      </Button>
      <Button
        variant="outline"
        render={<Link href="/api/export/inventario-pdf" />}
        nativeButton={false}
      >
        <FileText className="h-4 w-4" />
        PDF
      </Button>
    </div>
  );
}
