"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createClient, updateClient } from "@/server/actions/customers";

type FormValues = {
  name: string;
  rut: string;
  businessName: string;
  city: string;
  contactName: string;
  phone: string;
  email: string;
  birthdayMonth: string;
  birthdayDay: string;
  customerSince: string; // yyyy-mm-dd
  paymentTermsDays: string;
  discountPercent: number;
  assignedSellerId: string;
};

const EMPTY: FormValues = {
  name: "",
  rut: "",
  businessName: "",
  city: "",
  contactName: "",
  phone: "",
  email: "",
  birthdayMonth: "",
  birthdayDay: "",
  customerSince: "",
  paymentTermsDays: "",
  discountPercent: 0,
  assignedSellerId: "",
};

export type ClientEditData = Omit<FormValues, "discountPercent"> & { id: string; discountPercent: number };

export function ClientFormDialog({
  open,
  onOpenChange,
  initial,
  canAssignSeller,
  sellers,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** When present, edits this client instead of creating a new one. */
  initial?: ClientEditData;
  /** Only Admin/Preparador (customers:view-all) can (re)assign a seller. */
  canAssignSeller: boolean;
  sellers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const isEdit = !!initial;
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting },
  } = useForm<FormValues>({ defaultValues: initial ?? EMPTY });

  useEffect(() => {
    if (open) reset(initial ?? EMPTY);
  }, [open, initial, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      rut: values.rut,
      businessName: values.businessName || undefined,
      city: values.city || undefined,
      contactName: values.contactName || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      birthdayMonth: values.birthdayMonth ? Number(values.birthdayMonth) : undefined,
      birthdayDay: values.birthdayDay ? Number(values.birthdayDay) : undefined,
      customerSince: values.customerSince ? new Date(`${values.customerSince}T00:00:00.000Z`) : undefined,
      paymentTermsDays: values.paymentTermsDays ? Number(values.paymentTermsDays) : undefined,
      discountPercent: Number(values.discountPercent) || 0,
      assignedSellerId: values.assignedSellerId || undefined,
    };
    try {
      if (isEdit) {
        await updateClient(initial.id, payload);
        toast.success("Cliente actualizado");
      } else {
        await createClient(payload);
        toast.success("Cliente creado");
      }
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el cliente");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza los datos de contacto y condiciones comerciales."
              : "Agrega una óptica a tu cartera de clientes."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="client-name">Nombre</Label>
              <Input id="client-name" {...register("name", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-rut">RUT</Label>
              <Input id="client-rut" placeholder="Ej. 76.123.456-7" {...register("rut", { required: true })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-business">Razón social (opcional)</Label>
            <Input id="client-business" {...register("businessName")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="client-city">Ciudad</Label>
              <Input id="client-city" {...register("city")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-contact">Contacto</Label>
              <Input id="client-contact" placeholder="Persona de contacto" {...register("contactName")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="client-phone">Teléfono</Label>
              <Input id="client-phone" {...register("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-email">Email</Label>
              <Input id="client-email" type="email" {...register("email")} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label>Cumpleaños (opcional)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  max={12}
                  placeholder="Mes"
                  {...register("birthdayMonth")}
                />
                <Input
                  type="number"
                  min={1}
                  max={31}
                  placeholder="Día"
                  {...register("birthdayDay")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-since">Fecha de ingreso</Label>
              <Input id="client-since" type="date" {...register("customerSince")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="client-terms">Días de plazo</Label>
              <Input id="client-terms" type="number" min={0} placeholder="Ej. 30" {...register("paymentTermsDays")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-discount">% Descuento acordado</Label>
              <Input
                id="client-discount"
                type="number"
                min={0}
                max={100}
                {...register("discountPercent", { valueAsNumber: true })}
              />
            </div>
          </div>
          {canAssignSeller && (
            <div className="space-y-2">
              <Label>Vendedor asignado</Label>
              <Controller
                control={control}
                name="assignedSellerId"
                render={({ field }) => (
                  <Select
                    items={Object.fromEntries(sellers.map((s) => [s.id, s.name]))}
                    value={field.value}
                    onValueChange={(v) => field.onChange(v ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      {sellers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
