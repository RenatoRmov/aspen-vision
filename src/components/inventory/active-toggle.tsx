"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setProductActive } from "@/server/actions/products";

export function ActiveToggle({
  productId,
  active,
}: {
  productId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await setProductActive(productId, !active);
          toast.success(active ? "Producto desactivado" : "Producto activado");
          router.refresh();
        })
      }
    >
      {active ? "Desactivar" : "Activar"}
    </Button>
  );
}
