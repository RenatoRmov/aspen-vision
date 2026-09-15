"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createProduct, updateProduct } from "@/server/actions/products";

const schema = z.object({
  name: z.string().min(1, "El nombre del producto es obligatorio"),
  barcode: z.string().min(3, "El código de barras es muy corto"),
  brand: z.string().min(1, "Obligatorio"),
  model: z.string().min(1, "Obligatorio"),
  categoryId: z.string().min(1, "Selecciona una categoría"),
  shape: z.string().optional(),
  color: z.string().optional(),
  material: z.string().optional(),
  notes: z.string().optional(),
  images: z.array(z.string()).default([]),
  initialStock: z.coerce.number().int().min(0).optional(),
});

type FormValues = z.input<typeof schema>;

export function ProductForm({
  categories,
  product,
}: {
  categories: { id: string; name: string }[];
  product?: {
    id: string;
    name: string;
    barcode: string;
    brand: string;
    model: string;
    categoryId: string;
    shape: string | null;
    color: string | null;
    material: string | null;
    notes: string | null;
    images: string[];
  };
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanVideoRef = useRef<HTMLVideoElement>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: product
      ? {
          name: product.name,
          barcode: product.barcode,
          brand: product.brand,
          model: product.model,
          categoryId: product.categoryId,
          shape: product.shape ?? "",
          color: product.color ?? "",
          material: product.material ?? "",
          notes: product.notes ?? "",
          images: product.images,
        }
      : { images: [], initialStock: 0 },
  });

  const images = watch("images") ?? [];

  useEffect(() => {
    if (!scanOpen) return;
    let controls: { stop: () => void } | undefined;
    let cancelled = false;
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        if (cancelled || !scanVideoRef.current) return;
        controls = await reader.decodeFromVideoDevice(
          undefined,
          scanVideoRef.current,
          (result) => {
            if (result) {
              setValue("barcode", result.getText(), { shouldValidate: true });
              setScanOpen(false);
            }
          },
        );
      } catch {
        toast.error("No se pudo acceder a la cámara.");
        setScanOpen(false);
      }
    })();
    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [scanOpen, setValue]);

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error al subir la imagen");
        uploaded.push(data.url);
      }
      setValue("images", [...images, ...uploaded], { shouldValidate: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir la imagen");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url: string) => {
    setValue(
      "images",
      images.filter((i) => i !== url),
      { shouldValidate: true },
    );
  };

  const onSubmit = async (values: z.output<typeof schema>) => {
    try {
      if (product) {
        await updateProduct(product.id, values);
        toast.success("Producto actualizado");
        router.push(`/inventario/${product.id}`);
      } else {
        const id = await createProduct(values, values.initialStock ?? 0);
        toast.success("Producto creado");
        router.push(`/inventario/${id}`);
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el producto");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-1">
        <Label>Imágenes del producto</Label>
        <div className="grid grid-cols-2 gap-2">
          {images.map((url) => (
            <div
              key={url}
              className="relative aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              <Image src={url} alt="" fill className="object-cover" sizes="160px" />
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute right-1 top-1 rounded-full bg-foreground/70 p-1 text-background"
                title="Quitar imagen"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="relative flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground hover:bg-muted"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <ImagePlus className="h-5 w-5" />
                <span className="text-xs">Agregar</span>
              </>
            )}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/avif"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) void handleUpload(e.target.files);
            e.target.value = "";
          }}
        />
        <p className="text-xs text-muted-foreground">
          Puedes subir varias fotos. La primera se usa como portada.
        </p>
      </div>

      <div className="space-y-4 lg:col-span-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Nombre del producto</Label>
            <Input id="name" {...register("name")} placeholder="Ej. Aviador Original" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="barcode">Código de barras</Label>
            <div className="flex gap-2">
              <Input
                id="barcode"
                {...register("barcode")}
                placeholder="Escanea el código o escríbelo manualmente"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setScanOpen(true)}
                title="Escanear con cámara"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            {errors.barcode && (
              <p className="text-xs text-destructive">{errors.barcode.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand">Marca</Label>
            <Input id="brand" {...register("brand")} placeholder="Ej. Ray-Ban" />
            {errors.brand && <p className="text-xs text-destructive">{errors.brand.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Modelo</Label>
            <Input id="model" {...register("model")} placeholder="Ej. RB2140 Wayfarer" />
            {errors.model && <p className="text-xs text-destructive">{errors.model.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Categoría</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select
                  items={Object.fromEntries(categories.map((c) => [c.id, c.name]))}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId && (
              <p className="text-xs text-destructive">{errors.categoryId.message}</p>
            )}
          </div>

          {!product && (
            <div className="space-y-2">
              <Label htmlFor="initialStock">Stock Total</Label>
              <Input id="initialStock" type="number" min={0} {...register("initialStock")} />
              <p className="text-xs text-muted-foreground">
                Se registrará como una entrada de inventario.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="shape">Forma</Label>
            <Input id="shape" {...register("shape")} placeholder="Ej. Aviador, Redondo…" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input id="color" {...register("color")} placeholder="Ej. Negro, Habana…" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="material">Material</Label>
            <Input id="material" {...register("material")} placeholder="Ej. Acetato, Metal…" />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Detalles adicionales del producto"
              {...register("notes")}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || uploading}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {product ? "Guardar cambios" : "Crear producto"}
          </Button>
        </div>
      </div>

      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escanear código de barras</DialogTitle>
          </DialogHeader>
          <div className="relative overflow-hidden rounded-lg bg-black">
            <video ref={scanVideoRef} className="aspect-video w-full" muted />
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-16 -translate-y-1/2 rounded-md border-2 border-primary/80" />
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}
