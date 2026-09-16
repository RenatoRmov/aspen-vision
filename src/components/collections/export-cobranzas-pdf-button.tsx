"use client";

import { useSearchParams } from "next/navigation";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportCobranzasPdfButton() {
  const searchParams = useSearchParams();
  const href = `/api/pdf/cobranzas?${searchParams.toString()}`;

  return (
    <Button
      variant="outline"
      render={<a href={href} target="_blank" rel="noreferrer" />}
      nativeButton={false}
    >
      <FileDown className="h-4 w-4" />
      Exportar PDF
    </Button>
  );
}
