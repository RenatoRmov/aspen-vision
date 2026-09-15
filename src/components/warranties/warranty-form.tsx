"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductPicker, type PickedProduct } from "@/components/shared/product-picker";
import { createWarranty } from "@/server/actions/warranties";
import { primaryImage } from "@/lib/product-images";

type FormValues = {
  customerName: string;
  customerContact: string;
  quantity: number;
  reason: string;
  notes: string;
  responsibleId: string;
};

export function WarrantyForm({
  users,
  currentUserId,
}: {
  users: { id: string; name: string }[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [product, setProduct] = useState<PickedProduct | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { quantity: 1, responsibleId: currentUserId },
  });

  const onSubmit = async (values: FormValues) => {
    if (!product) {
      toast.error("Selecciona el producto afectado");
      return;
    }
    try {
      const id = await createWarranty({
        ...values,
        productId: product.id,
        quantity: Number(values.quantity),
      });
      toast.success("Garantía registrada");
      router.push(`/garantias`);
      router.refresh();
      void id;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo registrar la garantía");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-2xl space-y-4 rounded-xl border bg-card p-5"
    >
      <div className="space-y-2">
        <Label>Producto afectado</Label>
        {product ? (
          <div className="flex items-center gap-3 rounded-lg border p-2.5">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-muted">
              {primaryImage(product.images) && (
                <Image
                  src={primaryImage(product.images)!}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="44px"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{product.name}</p>
              <p className="text-xs text-muted-foreground">{product.barcode}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setProduct(null)}>
              Cambiar
            </Button>
          </div>
        ) : (
          <ProductPicker onSelect={setProduct} onlyInStock={false} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerName">Cliente</Label>
          <Input id="customerName" {...register("customerName", { required: true })} />
          {errors.customerName && (
            <p className="text-xs text-destructive">Obligatorio</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerContact">Contacto (opcional)</Label>
          <Input id="customerContact" {...register("customerContact")} placeholder="Teléfono o correo" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity">Cantidad</Label>
          <Input id="quantity" type="number" min={1} {...register("quantity")} />
        </div>
        <div className="space-y-2">
          <Label>Responsable</Label>
          <Controller
            control={control}
            name="responsibleId"
            render={({ field }) => (
              <Select
                items={Object.fromEntries(users.map((u) => [u.id, u.name]))}
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Motivo de la garantía</Label>
        <Textarea
          id="reason"
          rows={2}
          placeholder="Ej. Daño durante el envío, producto defectuoso…"
          {...register("reason", { required: true })}
        />
        {errors.reason && <p className="text-xs text-destructive">Obligatorio</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas adicionales</Label>
        <Textarea id="notes" rows={2} {...register("notes")} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          Registrar garantía
        </Button>
      </div>
    </form>
  );
}
