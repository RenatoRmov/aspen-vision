"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { CircleDollarSign, Loader2 } from "lucide-react";
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
import { addCollectionPayment } from "@/server/actions/collections";

type FormValues = {
  date: string;
  amount: number;
  method: string;
  note: string;
};

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
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      amount: saldo > 0 ? saldo : 0,
      method: PAYMENT_METHODS[0],
      note: "",
    },
  });

  // defaultValues is only read on mount, but this dialog stays mounted
  // (just hidden) between opens while `saldo` keeps changing as payments
  // come in — so re-seed the amount to the current saldo each time it opens.
  useEffect(() => {
    if (open) {
      reset({
        date: new Date().toISOString().slice(0, 10),
        amount: saldo > 0 ? saldo : 0,
        method: PAYMENT_METHODS[0],
        note: "",
      });
    }
  }, [open, saldo, reset]);

  const method = watch("method");

  const onSubmit = async (values: FormValues) => {
    try {
      await addCollectionPayment(collectionId, {
        date: new Date(`${values.date}T00:00:00.000Z`),
        amount: Number(values.amount),
        method: values.method,
        note: values.note || undefined,
      });
      toast.success("Abono registrado");
      reset();
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
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Monto</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  min={1}
                  {...register("amount", { required: true, valueAsNumber: true })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select
                items={Object.fromEntries(PAYMENT_METHODS.map((m) => [m, m]))}
                value={method}
                onValueChange={(v) => setValue("method", v ?? PAYMENT_METHODS[0])}
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
