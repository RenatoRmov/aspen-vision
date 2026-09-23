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
import { deleteWarranty } from "@/server/actions/warranties";

export function DeleteWarrantyButton({ warrantyId, code }: { warrantyId: string; code: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const onDelete = async () => {
    setLoading(true);
    try {
      await deleteWarranty(warrantyId);
      toast.success("Garantía eliminada");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar la garantía");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        title="Eliminar garantía"
      >
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar garantía {code}?</AlertDialogTitle>
          <AlertDialogDescription>
            El stock que se descontó al registrarla se restituirá automáticamente
            mediante un ajuste. Esta acción no se puede deshacer.
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
