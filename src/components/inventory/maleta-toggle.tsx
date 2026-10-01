"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setProductInMaleta } from "@/server/actions/products";

export function MaletaToggle({
  productId,
  inMaleta,
}: {
  productId: string;
  inMaleta: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant={inMaleta ? "outline" : "ghost"}
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await setProductInMaleta(productId, !inMaleta);
          toast.success(inMaleta ? "Producto retirado de la maleta" : "Producto marcado en maleta");
          router.refresh();
        })
      }
    >
      {inMaleta ? "Sí" : "No"}
    </Button>
  );
}
