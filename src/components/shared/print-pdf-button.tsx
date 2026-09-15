import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintPdfButton({ href }: { href: string }) {
  return (
    <Button variant="outline" render={<a href={href} target="_blank" rel="noreferrer" />} nativeButton={false}>
      <Printer className="h-4 w-4" />
      Imprimir PDF
    </Button>
  );
}
