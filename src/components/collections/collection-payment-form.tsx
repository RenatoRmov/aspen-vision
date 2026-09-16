"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { CircleDollarSign, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PAYMENT_METHODS } from "@/lib/collections";
import { formatCLP } from "@/lib/format";
import { addCollectionPayment } from "@/server/actions/collections";

type FormValues = {
  date: string;
  amount: number;
  method: string;
  note: string;
  checks: { label: string; amount: number }[];
};

function defaultValues(saldo: number): FormValues {
  return {
    date: new Date().toISOString().slice(0, 10),
    amount: saldo > 0 ? saldo : 0,
    method: PAYMENT_METHODS[0],
    note: "",
    checks: [],
  };
}

export function CollectionPaymentForm({
  collectionId,
  saldo,
}: {
  collectionId: string;
  saldo: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { isSubmitting },
  } = useForm<FormValues>({ defaultValues: defaultValues(saldo) });

  const { fields, append, remove } = useFieldArray({ control, name: "checks" });

  // defaultValues is only read on mount, but this dialog stays mounted
  // (just hidden) between opens while `saldo` keeps changing as payments
  // come in — so re-seed the form to the current saldo each time it opens.
  useEffect(() => {
    if (open) reset(defaultValues(saldo));
  }, [open, saldo, reset]);

  const method = watch("method");
  const checks = watch("checks");
  const isCheque = method === "Cheque";
  const checksTotal = checks.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  // Switching into "Cheque" seeds one row so the fields are immediately
  // usable; switching away just leaves the plain amount field in charge.
  const onMethodChange = (v: string | null) => {
    const next = v ?? PAYMENT_METHODS[0];
    setValue("method", next);
    if (next === "Cheque" && fields.length === 0) {
      append({ label: "Cheque 1", amount: saldo > 0 ? saldo : 0 });
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (isCheque && values.checks.length === 0) {
      toast.error("Agrega al menos un cheque");
      return;
    }
    try {
      await addCollectionPayment(collectionId, {
        date: new Date(`${values.date}T00:00:00.000Z`),
        amount: Number(values.amount),
        method: values.method,
        note: values.note || undefined,
        checks: isCheque
          ? values.checks.map((c) => ({ label: c.label, amount: Number(c.amount) }))
          : undefined,
      });
      toast.success("Abono registrado");
      reset(defaultValues(saldo));
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo registrar el abono");
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <CircleDollarSign className="h-4 w-4" />
        Registrar abono
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar abono</DialogTitle>
            <DialogDescription>
              El saldo se actualiza automáticamente al guardar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="payment-date">Fecha</Label>
                <Input id="payment-date" type="date" {...register("date", { required: true })} />
              </div>
              {!isCheque && (
                <div className="space-y-2">
                  <Label htmlFor="payment-amount">Monto</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    min={1}
                    {...register("amount", { required: true, valueAsNumber: true })}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select
                items={Object.fromEntries(PAYMENT_METHODS.map((m) => [m, m]))}
                value={method}
                onValueChange={onMethodChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isCheque && (
              <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                <Label>Cheques</Label>
                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Input
                        placeholder={`Cheque ${index + 1}`}
                        {...register(`checks.${index}.label` as const, { required: true })}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        min={1}
                        placeholder="Monto"
                        {...register(`checks.${index}.amount` as const, {
                          required: true,
                          valueAsNumber: true,
                        })}
                        className="w-28"
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
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ label: `Cheque ${fields.length + 1}`, amount: 0 })
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar cheque
                </Button>
                <p className="flex justify-between border-t pt-2 text-sm">
                  <span className="text-muted-foreground">Total cheques</span>
                  <span className="font-medium tabular-nums">{formatCLP(checksTotal)}</span>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="payment-note">Nota (opcional)</Label>
              <Textarea
                id="payment-note"
                rows={2}
                placeholder="Ej. Pagó con cheque a 30 días"
                {...register("note")}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                Registrar abono
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
