"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FileMinus, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
import { formatCLP } from "@/lib/format";
import { computeCreditNoteTotals } from "@/lib/collections";
import { addCreditNote, updateCreditNote } from "@/server/actions/collections";

type FormValues = {
  date: string;
  note: string;
  items: { modelo: string; cantidad: number; valorUnitario: number }[];
};

export type CreditNoteEditData = {
  id: string;
  date: string; // yyyy-mm-dd
  note: string;
  items: { modelo: string; cantidad: number; valorUnitario: number }[];
};

function seedValues(initial?: CreditNoteEditData): FormValues {
  if (initial) {
    return { date: initial.date, note: initial.note, items: initial.items };
  }
  return {
    date: new Date().toISOString().slice(0, 10),
    note: "",
    items: [{ modelo: "", cantidad: 1, valorUnitario: 0 }],
  };
}

export function CreditNoteForm({
  collectionId,
  initial,
}: {
  collectionId: string;
  /** When present, edits this nota de crédito instead of creating a new one. */
  initial?: CreditNoteEditData;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isEdit = !!initial;
  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { isSubmitting },
  } = useForm<FormValues>({ defaultValues: seedValues(initial) });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  // This dialog stays mounted (just hidden) between opens, so re-seed every
  // time it opens — an edit dialog may point at a different row each time.
  useEffect(() => {
    if (open) reset(seedValues(initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id, reset]);

  const items = watch("items");
  const { bruto, iva, total } = computeCreditNoteTotals(
    items.map((it) => ({
      cantidad: Number(it.cantidad) || 0,
      valorUnitario: Number(it.valorUnitario) || 0,
    })),
  );

  const onSubmit = async (values: FormValues) => {
    const payload = {
      date: new Date(`${values.date}T00:00:00.000Z`),
      note: values.note || undefined,
      items: values.items.map((it) => ({
        modelo: it.modelo.trim(),
        cantidad: Number(it.cantidad),
        valorUnitario: Number(it.valorUnitario),
      })),
    };
    try {
      if (isEdit) {
        await updateCreditNote(initial.id, payload);
        toast.success("Nota de crédito actualizada");
      } else {
        await addCreditNote(collectionId, payload);
        toast.success("Nota de crédito registrada");
      }
      reset(seedValues(initial));
      setOpen(false);
      router.refresh();
    } catch (err) {
      const verb = isEdit ? "actualizar" : "registrar";
      toast.error(err instanceof Error ? err.message : `No se pudo ${verb} la nota de crédito`);
    }
  };

  return (
    <>
      {isEdit ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setOpen(true)}
          title="Editar nota de crédito"
        >
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      ) : (
        <Button variant="outline" onClick={() => setOpen(true)}>
          <FileMinus className="h-4 w-4" />
          Nota de Crédito
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Editar nota de crédito" : "Registrar nota de crédito"}</DialogTitle>
            <DialogDescription>
              Por lentes que el cliente devolvió. El Monto Total y el saldo pendiente se
              descuentan automáticamente al guardar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="credit-note-date">Fecha</Label>
              <Input id="credit-note-date" type="date" {...register("date", { required: true })} />
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              <Label>Modelos devueltos</Label>
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-1.5 rounded-md bg-background p-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Modelo"
                        {...register(`items.${index}.modelo` as const, { required: true })}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 pr-8">
                      <Input
                        type="number"
                        min={1}
                        placeholder="Cantidad"
                        {...register(`items.${index}.cantidad` as const, {
                          required: true,
                          valueAsNumber: true,
                        })}
                        className="w-24"
                      />
                      <Input
                        type="number"
                        min={1}
                        placeholder="Valor unitario"
                        {...register(`items.${index}.valorUnitario` as const, {
                          required: true,
                          valueAsNumber: true,
                        })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ modelo: "", cantidad: 1, valorUnitario: 0 })}
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar modelo
              </Button>
              <div className="space-y-1 border-t pt-2 text-sm">
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Nota de Crédito Bruto</span>
                  <span className="tabular-nums">{formatCLP(bruto)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Valor IVA (19%)</span>
                  <span className="tabular-nums">{formatCLP(iva)}</span>
                </p>
                <p className="flex justify-between border-t pt-1">
                  <span className="font-medium">Valor Total Nota de Crédito</span>
                  <span className="font-medium tabular-nums">{formatCLP(total)}</span>
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="credit-note-note">Nota (opcional)</Label>
              <Textarea
                id="credit-note-note"
                rows={2}
                placeholder="Ej. Devolución por talla incorrecta"
                {...register("note")}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                {isEdit ? "Guardar cambios" : "Registrar nota de crédito"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
