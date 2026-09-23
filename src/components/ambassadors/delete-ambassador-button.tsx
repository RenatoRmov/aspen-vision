"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { deleteAmbassador } from "@/server/actions/ambassadors";

export function DeleteAmbassadorButton({
  ambassadorId,
  name,
  deliveryCount,
}: {
  ambassadorId: string;
  name: string;
  deliveryCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const onDelete = async () => {
    setLoading(true);
    try {
      await deleteAmbassador(ambassadorId);
      toast.success("Embajador eliminado");
      setOpen(false);
      router.push("/embajadores");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar el embajador");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />
        Eliminar embajador
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar a {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {deliveryCount > 0
              ? `Se eliminarán también sus ${deliveryCount} entrega(s) registradas, y el stock entregado en ellas se restituirá automáticamente mediante ajustes.`
              : "Este embajador no tiene entregas registradas."}{" "}
            Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button variant="destructive" onClick={onDelete} disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Sí, eliminar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
