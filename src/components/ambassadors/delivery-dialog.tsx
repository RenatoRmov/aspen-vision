"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Gift, Loader2, Trash2 } from "lucide-react";
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
import { ProductPicker, type PickedProduct } from "@/components/shared/product-picker";
import { createAmbassadorDelivery } from "@/server/actions/ambassadors";
import { primaryImage } from "@/lib/product-images";

type Line = {
  productId: string;
  name: string;
  imageUrl: string | null;
  stock: number;
  quantity: number;
};

export function DeliveryDialog({ ambassadorId }: { ambassadorId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const addProduct = (p: PickedProduct) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        { productId: p.id, name: p.name, imageUrl: primaryImage(p.images), stock: p.stock, quantity: 1 },
      ];
    });
  };

  const reset = () => {
    setLines([]);
    setNotes("");
  };

  const onSubmit = async () => {
    if (lines.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }
    const overStock = lines.find((l) => l.quantity > l.stock);
    if (overStock) {
      toast.error(`Solo hay ${overStock.stock} unidad(es) de ${overStock.name}`);
      return;
    }

    setSubmitting(true);
    try {
      await createAmbassadorDelivery({
        ambassadorId,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        notes,
      });
      toast.success("Entrega registrada");
      reset();
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo registrar la entrega");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Gift className="h-4 w-4" />
        Registrar entrega
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar entrega a embajador</DialogTitle>
            <DialogDescription>
              Estos lentes se descuentan del inventario sin generar una venta
              ni un valor comercial.
            </DialogDescription>
          </DialogHeader>

          <ProductPicker onSelect={addProduct} onlyInStock />

          {lines.length > 0 && (
            <ul className="divide-y rounded-lg border">
              {lines.map((l) => (
                <li key={l.productId} className="flex items-center gap-3 p-2.5">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                    {l.imageUrl && (
                      <Image src={l.imageUrl} alt="" fill className="object-cover" sizes="40px" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.name}</p>
                    <p className="text-xs text-muted-foreground">Stock: {l.stock}</p>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={l.quantity}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((x) =>
                          x.productId === l.productId
                            ? { ...x, quantity: Math.max(1, Number(e.target.value)) }
                            : x,
                        ),
                      )
                    }
                    className="w-16 text-center"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setLines((prev) => prev.filter((x) => x.productId !== l.productId))
                    }
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2">
            <Label htmlFor="delivery-notes">Notas</Label>
            <Textarea
              id="delivery-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Colaboración Instagram, unboxing…"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={onSubmit} disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Registrar entrega
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
