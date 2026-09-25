"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { confirmSale, cancelSale, deleteSale } from "@/server/actions/sales";

export function ConfirmSaleButton({
  saleId,
  insufficientItems = [],
}: {
  saleId: string;
  /** Items whose sale quantity already exceeds current stock, computed from
   * what's on the page — a heads-up shown before confirming. The actual
   * shortage (if any) is only certain once the stock is really discounted;
   * see the toast built from confirmSale's own result below. */
  insufficientItems?: { name: string; available: number; requested: number }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const onConfirm = async () => {
    setLoading(true);
    const result = await confirmSale(saleId);
    if (!result.ok) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    toast.success("Venta confirmada, inventario descontado");
    if (result.shortages.length > 0) {
      const list = result.shortages.map((s) => `${s.name} (${s.stock})`).join(", ");
      toast.warning(`Quedaron con stock negativo: ${list}`);
    }
    setOpen(false);
    router.refresh();
    setLoading(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <CheckCircle2 className="h-4 w-4" />
        Confirmar pedido
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Confirmar este pedido?</AlertDialogTitle>
          <AlertDialogDescription>
            Al confirmar, el inventario de cada producto se descontará de
            inmediato. Esta acción no se puede deshacer manualmente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {insufficientItems.length > 0 && (
          <div className="flex gap-2 rounded-lg bg-status-critical/10 p-3 text-sm text-status-critical">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Stock insuficiente para:</p>
              <ul className="mt-1 list-inside list-disc">
                {insufficientItems.map((i) => (
                  <li key={i.name}>
                    {i.name} — disponible: {i.available}, solicitado: {i.requested}
                  </li>
                ))}
              </ul>
              <p className="mt-1">Puedes confirmar igual; el stock quedará en negativo.</p>
            </div>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Sí, confirmar y descontar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function CancelSaleButton({ saleId }: { saleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const onCancel = async () => {
    setLoading(true);
    const result = await cancelSale(saleId, reason);
    if (!result.ok) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    toast.success("Venta cancelada");
    setOpen(false);
    router.refresh();
    setLoading(false);
  };

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <XCircle className="h-4 w-4" />
        Cancelar venta
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancelar venta</DialogTitle>
            <DialogDescription>
              Si el inventario ya fue descontado, se restituirá
              automáticamente mediante un ajuste.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Motivo de la cancelación</Label>
            <Textarea
              id="cancel-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Cliente se arrepintió, error de registro…"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Volver
            </Button>
            <Button variant="destructive" onClick={onCancel} disabled={loading || !reason.trim()}>
              {loading && <Loader2 className="animate-spin" />}
              Confirmar cancelación
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** `variant="icon"` renders a compact row action (list table) instead of the
 * full labeled button (sale detail page) — same delete flow either way. */
export function DeleteSaleButton({
  saleId,
  variant = "full",
}: {
  saleId: string;
  variant?: "full" | "icon";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const onDelete = async () => {
    setLoading(true);
    const result = await deleteSale(saleId);
    if (!result.ok) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    toast.success("Venta eliminada");
    setOpen(false);
    router.push("/ventas");
    router.refresh();
    setLoading(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {variant === "icon" ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setOpen(true)}
          title="Eliminar venta"
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      ) : (
        <Button variant="destructive" onClick={() => setOpen(true)}>
          <Trash2 className="h-4 w-4" />
          Eliminar venta
        </Button>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar esta venta?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará por completo, junto con sus productos. Si el inventario ya
            había sido descontado, se restituirá automáticamente mediante un ajuste.
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
