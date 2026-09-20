"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { CalendarPlus, Loader2 } from "lucide-react";
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
import { ClientCombobox } from "@/components/customers/client-combobox";
import { ACTIVITY_TYPE_LABEL, type CustomerActivityType } from "@/lib/customers";
import { createActivity } from "@/server/actions/customers";

type FormValues = {
  type: CustomerActivityType;
  date: string; // yyyy-mm-dd
  summary: string;
  nextAction: string;
  nextActionDate: string;
};

function seedValues(): FormValues {
  return {
    type: "VISITA",
    date: new Date().toISOString().slice(0, 10),
    summary: "",
    nextAction: "",
    nextActionDate: "",
  };
}

type ClientMatch = { id: string; name: string; rut: string; businessName: string | null };

/** Registers a seguimiento comercial entry. When `customerId` is fixed (used
 * from a client's own detail page), the client picker is skipped entirely;
 * otherwise (used from "+ Registrar visita" on Hoy) it's the first field. */
export function ActivityFormDialog({
  customerId,
  triggerLabel = "Registrar visita",
}: {
  customerId?: string;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pickedClient, setPickedClient] = useState<ClientMatch | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting },
  } = useForm<FormValues>({ defaultValues: seedValues() });

  useEffect(() => {
    if (!open) return;
    reset(seedValues());
    const t = setTimeout(() => setPickedClient(null), 0);
    return () => clearTimeout(t);
  }, [open, reset]);

  const onSubmit = async (values: FormValues) => {
    const targetCustomerId = customerId ?? pickedClient?.id;
    if (!targetCustomerId) {
      toast.error("Selecciona un cliente");
      return;
    }
    try {
      await createActivity({
        customerId: targetCustomerId,
        date: new Date(`${values.date}T00:00:00.000Z`),
        type: values.type,
        summary: values.summary,
        nextAction: values.nextAction || undefined,
        nextActionDate: values.nextActionDate
          ? new Date(`${values.nextActionDate}T00:00:00.000Z`)
          : undefined,
      });
      toast.success("Seguimiento registrado");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo registrar el seguimiento");
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4" />
        {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar seguimiento</DialogTitle>
            <DialogDescription>
              Deja constancia de la visita, llamada o WhatsApp y, si corresponde, la
              próxima acción a seguir.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {!customerId && <ClientCombobox value={pickedClient} onChange={setPickedClient} />}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select
                      items={ACTIVITY_TYPE_LABEL}
                      value={field.value}
                      onValueChange={(v) => field.onChange(v ?? "VISITA")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ACTIVITY_TYPE_LABEL).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-date">Fecha</Label>
                <Input id="activity-date" type="date" {...register("date", { required: true })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity-summary">Resumen</Label>
              <Textarea
                id="activity-summary"
                rows={2}
                placeholder="Ej. Revisamos colección Mormaii, le gustó el modelo Smash"
                {...register("summary", { required: true })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="activity-next">Próxima acción (opcional)</Label>
                <Input id="activity-next" placeholder="Ej. Llamar con stock" {...register("nextAction")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-next-date">Fecha de la acción</Label>
                <Input id="activity-next-date" type="date" {...register("nextActionDate")} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                Registrar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
