"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, PackagePlus, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { registerAjuste, registerEntrada } from "@/server/actions/products";

type FormValues = { quantity: number; reason: string };

export function StockActions({
  productId,
  currentStock,
}: {
  productId: string;
  currentStock: number;
}) {
  const [entradaOpen, setEntradaOpen] = useState(false);
  const [ajusteOpen, setAjusteOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => setEntradaOpen(true)}>
        <PackagePlus className="h-4 w-4" />
        Registrar entrada
      </Button>
      <Button variant="outline" onClick={() => setAjusteOpen(true)}>
        <SlidersHorizontal className="h-4 w-4" />
        Ajustar stock
      </Button>

      <EntradaDialog
        productId={productId}
        open={entradaOpen}
        onOpenChange={setEntradaOpen}
      />
      <AjusteDialog
        productId={productId}
        currentStock={currentStock}
        open={ajusteOpen}
        onOpenChange={setAjusteOpen}
      />
    </div>
  );
}

function EntradaDialog({
  productId,
  open,
  onOpenChange,
}: {
  productId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({ defaultValues: { quantity: 1, reason: "" } });

  const onSubmit = async (values: FormValues) => {
    try {
      await registerEntrada({
        productId,
        quantity: Number(values.quantity),
        reason: values.reason || "Recepción de stock",
      });
      toast.success("Entrada registrada");
      reset();
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo registrar la entrada");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar entrada de inventario</DialogTitle>
          <DialogDescription>
            Suma unidades al stock, por ejemplo al recibir un pedido del
            proveedor.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="entrada-qty">Cantidad a ingresar</Label>
            <Input id="entrada-qty" type="number" min={1} {...register("quantity")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="entrada-reason">Motivo / referencia</Label>
            <Textarea
              id="entrada-reason"
              rows={2}
              placeholder="Ej. Recepción pedido proveedor #4521"
              {...register("reason")}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Registrar entrada
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AjusteDialog({
  productId,
  currentStock,
  open,
  onOpenChange,
}: {
  productId: string;
  currentStock: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<FormValues>({ defaultValues: { quantity: 0, reason: "" } });

  const delta = Number(watch("quantity")) || 0;

  const onSubmit = async (values: FormValues) => {
    try {
      await registerAjuste({
        productId,
        quantity: Number(values.quantity),
        reason: values.reason,
      });
      toast.success("Ajuste registrado");
      reset();
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo registrar el ajuste");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajustar stock</DialogTitle>
          <DialogDescription>
            Corrige el inventario tras un recuento físico, daño o pérdida.
            Usa un número negativo para restar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ajuste-qty">Cantidad (+/-)</Label>
            <Input id="ajuste-qty" type="number" {...register("quantity")} />
            <p className="text-xs text-muted-foreground">
              Stock actual: {currentStock} → nuevo stock: {currentStock + delta}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ajuste-reason">Motivo (obligatorio)</Label>
            <Textarea
              id="ajuste-reason"
              rows={2}
              placeholder="Ej. Recuento físico de bodega, se encontró 1 unidad dañada"
              {...register("reason", { required: true })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || delta === 0}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Guardar ajuste
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
