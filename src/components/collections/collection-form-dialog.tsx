"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatCLP } from "@/lib/format";
import { createCollection, updateCollection } from "@/server/actions/collections";

type FormValues = {
  city: string;
  clientRut: string;
  businessName: string;
  folio: string;
  documentDate: string; // yyyy-mm-dd
  netAmount: number;
  taxAmount: number;
};

const EMPTY: FormValues = {
  city: "",
  clientRut: "",
  businessName: "",
  folio: "",
  documentDate: new Date().toISOString().slice(0, 10),
  netAmount: 0,
  taxAmount: 0,
};

export type CollectionEditData = FormValues & { id: string };

export function CollectionFormDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** When present, edits this collection instead of creating a new one. */
  initial?: CollectionEditData;
}) {
  const router = useRouter();
  const isEdit = !!initial;
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<FormValues>({ defaultValues: initial ?? EMPTY });

  useEffect(() => {
    if (open) reset(initial ?? EMPTY);
  }, [open, initial, reset]);

  const netAmount = Number(watch("netAmount")) || 0;
  const taxAmount = Number(watch("taxAmount")) || 0;
  const totalAmount = netAmount + taxAmount;

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        city: values.city,
        clientRut: values.clientRut,
        businessName: values.businessName,
        folio: values.folio,
        documentDate: new Date(`${values.documentDate}T00:00:00.000Z`),
        netAmount: Number(values.netAmount),
        taxAmount: Number(values.taxAmount),
        totalAmount,
      };
      if (isEdit) {
        await updateCollection(initial.id, payload);
        toast.success("Cobranza actualizada");
      } else {
        await createCollection(payload);
        toast.success("Cobranza agregada");
      }
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo guardar la cobranza",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cobranza" : "Agregar cobranza"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Corrige los datos del documento. El total abonado y el saldo no cambian aquí."
              : "Registra manualmente un documento por cobrar."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="col-city">Ciudad</Label>
              <Input id="col-city" {...register("city", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="col-rut">Rut cliente</Label>
              <Input
                id="col-rut"
                placeholder="Ej. 12.345.678-9"
                {...register("clientRut", { required: true })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="col-business">Razón social</Label>
            <Input id="col-business" {...register("businessName", { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="col-folio">Folio</Label>
              <Input id="col-folio" {...register("folio", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="col-date">Fecha Docto</Label>
              <Input
                id="col-date"
                type="date"
                {...register("documentDate", { required: true })}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="col-net">Monto Neto</Label>
              <Input
                id="col-net"
                type="number"
                min={0}
                {...register("netAmount", { required: true, valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="col-tax">Monto IVA</Label>
              <Input
                id="col-tax"
                type="number"
                min={0}
                {...register("taxAmount", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Monto Total</Label>
              <p className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm font-medium tabular-nums">
                {formatCLP(totalAmount)}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isEdit ? "Guardar cambios" : "Agregar cobranza"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
