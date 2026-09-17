"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { CalendarClock, CircleDollarSign, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
import { PAYMENT_METHODS, type CollectionPaymentKind } from "@/lib/collections";

/** This form only ever handles Abono/Acuerdo — Nota de Crédito has its own
 * dedicated form (different fields entirely: line items, no method/checks). */
type PaymentFormKind = Exclude<CollectionPaymentKind, "NOTA_CREDITO">;
import { formatCLP } from "@/lib/format";
import { addCollectionPayment, updateCollectionPayment } from "@/server/actions/collections";

type FormValues = {
  date: string;
  amount: number;
  method: string;
  note: string;
  checks: { label: string; amount: number; numero: string; banco: string }[];
};

export type PaymentEditData = {
  id: string;
  date: string; // yyyy-mm-dd
  amount: number;
  method: string;
  note: string;
  checks: { label: string; amount: number; numero?: string; banco?: string }[];
};

function seedValues(saldo: number, initial?: PaymentEditData): FormValues {
  if (initial) {
    return {
      date: initial.date,
      amount: initial.amount,
      method: initial.method,
      note: initial.note,
      checks: initial.checks.map((c) => ({
        label: c.label,
        amount: c.amount,
        numero: c.numero ?? "",
        banco: c.banco ?? "",
      })),
    };
  }
  return {
    date: new Date().toISOString().slice(0, 10),
    amount: saldo > 0 ? saldo : 0,
    method: PAYMENT_METHODS[0],
    note: "",
    checks: [],
  };
}

const COPY: Record<
  PaymentFormKind,
  {
    trigger: string;
    icon: typeof CircleDollarSign;
    title: string;
    editTitle: string;
    description: string;
    dateLabel: string;
    amountLabel: string;
    submit: string;
    editSubmit: string;
  }
> = {
  ABONO: {
    trigger: "Registrar abono",
    icon: CircleDollarSign,
    title: "Registrar abono",
    editTitle: "Editar abono",
    description: "El saldo se actualiza automáticamente al guardar.",
    dateLabel: "Fecha",
    amountLabel: "Monto",
    submit: "Registrar abono",
    editSubmit: "Guardar cambios",
  },
  ACUERDO: {
    trigger: "Acuerdo Comercial",
    icon: CalendarClock,
    title: "Registrar acuerdo comercial",
    editTitle: "Editar acuerdo comercial",
    description:
      "Solo informativo — no descuenta del saldo pendiente. Anota la fecha y el monto que el cliente prometió pagar.",
    dateLabel: "Fecha de pago prometida",
    amountLabel: "Monto acordado",
    submit: "Registrar acuerdo",
    editSubmit: "Guardar cambios",
  },
};

export function CollectionPaymentForm({
  collectionId,
  saldo,
  kind = "ABONO",
  initial,
}: {
  collectionId: string;
  saldo: number;
  kind?: PaymentFormKind;
  /** When present, edits this payment instead of creating a new one. */
  initial?: PaymentEditData;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isEdit = !!initial;
  const copy = COPY[kind];
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { isSubmitting },
  } = useForm<FormValues>({ defaultValues: seedValues(saldo, initial) });

  const { fields, append, remove } = useFieldArray({ control, name: "checks" });

  // defaultValues is only read on mount, but this dialog stays mounted (just
  // hidden) between opens, so re-seed every time it opens: for a create
  // dialog `saldo` keeps changing as payments come in, for an edit dialog
  // `initial` may point at a different row each time.
  useEffect(() => {
    if (open) reset(seedValues(saldo, initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, saldo, initial?.id, reset]);

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
      append({ label: "Cheque 1", amount: saldo > 0 ? saldo : 0, numero: "", banco: "" });
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (isCheque && values.checks.length === 0) {
      toast.error("Agrega al menos un cheque");
      return;
    }
    const payload = {
      kind,
      date: new Date(`${values.date}T00:00:00.000Z`),
      amount: Number(values.amount),
      method: values.method,
      note: values.note || undefined,
      checks: isCheque
        ? values.checks.map((c) => ({
            label: c.label,
            amount: Number(c.amount),
            numero: c.numero || undefined,
            banco: c.banco || undefined,
          }))
        : undefined,
    };
    try {
      if (isEdit) {
        await updateCollectionPayment(initial.id, payload);
        toast.success(kind === "ABONO" ? "Abono actualizado" : "Acuerdo actualizado");
      } else {
        await addCollectionPayment(collectionId, payload);
        toast.success(kind === "ABONO" ? "Abono registrado" : "Acuerdo registrado");
      }
      reset(seedValues(saldo, initial));
      setOpen(false);
      router.refresh();
    } catch (err) {
      const verb = isEdit ? "actualizar" : "registrar";
      toast.error(
        err instanceof Error
          ? err.message
          : `No se pudo ${verb} el ${kind === "ABONO" ? "abono" : "acuerdo"}`,
      );
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
          title={copy.editTitle}
        >
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      ) : (
        <Button variant={kind === "ACUERDO" ? "outline" : "default"} onClick={() => setOpen(true)}>
          <copy.icon className="h-4 w-4" />
          {copy.trigger}
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{isEdit ? copy.editTitle : copy.title}</DialogTitle>
            <DialogDescription>{copy.description}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="payment-date">{copy.dateLabel}</Label>
                <Input id="payment-date" type="date" {...register("date", { required: true })} />
              </div>
              {!isCheque && (
                <div className="space-y-2">
                  <Label htmlFor="payment-amount">{copy.amountLabel}</Label>
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
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                <Label>Cheques</Label>
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="space-y-1.5 rounded-md bg-background p-2">
                      <div className="flex items-center gap-2">
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
                      <div className="flex items-center gap-2 pr-8">
                        <Input
                          placeholder="N° de cheque (opcional)"
                          {...register(`checks.${index}.numero` as const)}
                          className="flex-1 text-xs"
                        />
                        <Input
                          placeholder="Banco (opcional)"
                          {...register(`checks.${index}.banco` as const)}
                          className="flex-1 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ label: `Cheque ${fields.length + 1}`, amount: 0, numero: "", banco: "" })
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
                {isEdit ? copy.editSubmit : copy.submit}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
