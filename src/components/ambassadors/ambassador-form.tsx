"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createAmbassador } from "@/server/actions/ambassadors";

type FormValues = {
  name: string;
  email: string;
  phone: string;
  instagram: string;
  tiktok: string;
  notes: string;
};

export function AmbassadorForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const onSubmit = async (values: FormValues) => {
    try {
      const id = await createAmbassador(values);
      toast.success("Embajador creado");
      router.push(`/embajadores/${id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear el embajador");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-xl space-y-4 rounded-xl border bg-card p-5"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" {...register("name", { required: true })} placeholder="Nombre completo" />
        {errors.name && <p className="text-xs text-destructive">Obligatorio</p>}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="instagram">Instagram</Label>
          <Input id="instagram" {...register("instagram")} placeholder="@usuario" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tiktok">TikTok</Label>
          <Input id="tiktok" {...register("tiktok")} placeholder="@usuario" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" type="email" {...register("email")} placeholder="correo@ejemplo.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" {...register("phone")} placeholder="+56 9 ..." />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" rows={3} {...register("notes")} placeholder="Contexto sobre la colaboración" />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          Crear embajador
        </Button>
      </div>
    </form>
  );
}
