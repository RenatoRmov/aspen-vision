"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Trash2, AlertTriangle, ChevronUp, ChevronDown, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductPicker, type PickedProduct } from "@/components/shared/product-picker";
import { CustomerPicker, type CustomerValue } from "@/components/sales/customer-picker";
import { primaryImage } from "@/lib/product-images";
import { formatCLP } from "@/lib/format";
import { createSale, updateSale } from "@/server/actions/sales";

const IVA_RATE = 0.19;

type Line = {
  productId: string;
  name: string;
  brand: string;
  model: string;
  imageUrl: string | null;
  stock: number;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  notes: string;
};

const PAYMENT_METHODS = ["Efectivo", "Débito", "Crédito", "Transferencia", "Otro"];

export type SaleFormInitialData = {
  id: string;
  items: Line[];
  customer: CustomerValue;
  paymentMethod: string;
  notes: string;
};

export function SaleForm({
  sellers,
  isAdmin,
  currentUserId,
  initialSale,
}: {
  sellers: { id: string; name: string }[];
  isAdmin: boolean;
  currentUserId: string;
  /** When present, the form edits this sale instead of creating a new one. */
  initialSale?: SaleFormInitialData;
}) {
  const router = useRouter();
  const isEdit = !!initialSale;
  const [lines, setLines] = useState<Line[]>(initialSale?.items ?? []);
  const [requiresConfirmation, setRequiresConfirmation] = useState(true);
  const [customer, setCustomer] = useState<CustomerValue>(
    initialSale?.customer ?? { name: "", rut: "", businessName: "" },
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(
    initialSale?.paymentMethod || "Efectivo",
  );
  const [notes, setNotes] = useState(initialSale?.notes ?? "");
  const [sellerId, setSellerId] = useState(currentUserId);
  const [submitting, setSubmitting] = useState(false);
  const [noteOpenFor, setNoteOpenFor] = useState<string | null>(null);

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
        {
          productId: p.id,
          name: p.name,
          brand: p.brand,
          model: p.model,
          imageUrl: primaryImage(p.images),
          stock: p.stock,
          quantity: 1,
          unitPrice: 0,
          discountPercent: 0,
          notes: "",
        },
      ];
    });
  };

  const updateLine = (productId: string, patch: Partial<Line>) => {
    setLines((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)),
    );
  };

  const removeLine = (productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  };

  const moveLine = (index: number, dir: -1 | 1) => {
    setLines((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const computed = useMemo(
    () =>
      lines.map((l) => {
        const gross = l.quantity * l.unitPrice;
        const discountAmount = Math.round(gross * (l.discountPercent / 100));
        const subtotal = gross - discountAmount;
        const taxAmount = Math.round(subtotal * IVA_RATE);
        return { ...l, discountAmount, subtotal, taxAmount, total: subtotal + taxAmount };
      }),
    [lines],
  );

  const subtotal = computed.reduce((s, l) => s + l.subtotal, 0);
  const taxAmount = computed.reduce((s, l) => s + l.taxAmount, 0);
  const total = computed.reduce((s, l) => s + l.total, 0);
  const totalUnits = computed.reduce((s, l) => s + l.quantity, 0);
  const totalDiscount = computed.reduce((s, l) => s + l.discountAmount, 0);

  const insufficientStock = lines.some(
    (l) => !isEdit && !requiresConfirmation && l.quantity > l.stock,
  );

  const onSubmit = async () => {
    if (lines.length === 0) {
      toast.error("Agrega al menos un producto a la venta");
      return;
    }
    if (insufficientStock) {
      toast.error("Hay productos sin stock suficiente para descuento inmediato");
      return;
    }
    if (customer.rut && !customer.name) {
      toast.error("Ingresa el nombre del comprador");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountPercent: l.discountPercent,
          notes: l.notes || undefined,
        })),
        requiresConfirmation,
        customer: customer.rut ? customer : undefined,
        paymentMethod,
        notes,
        sellerId: isAdmin ? sellerId : undefined,
      };

      if (isEdit) {
        await updateSale(initialSale.id, payload);
        toast.success("Venta actualizada");
        router.push(`/ventas/${initialSale.id}`);
      } else {
        const id = await createSale(payload);
        toast.success("Venta registrada");
        router.push(`/ventas/${id}`);
      }
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : `No se pudo ${isEdit ? "actualizar" : "registrar"} la venta`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-xl border bg-card p-4">
          <Label className="mb-2 block">Agregar productos</Label>
          <ProductPicker onSelect={addProduct} onlyInStock={false} />
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          {computed.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Aún no has agregado productos a esta venta.
            </p>
          ) : (
            <ul className="divide-y">
              {computed.map((l, index) => (
                <li key={l.productId} className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 shrink-0 text-center text-xs font-medium text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="flex shrink-0 flex-col">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveLine(index, -1)}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === computed.length - 1}
                        onClick={() => moveLine(index, 1)}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      {l.imageUrl && (
                        <Image src={l.imageUrl} alt="" fill className="object-cover" sizes="48px" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{l.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {l.brand} {l.model}
                      </p>
                      {!isEdit && !requiresConfirmation && l.quantity > l.stock && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-status-critical">
                          <AlertTriangle className="h-3 w-3" />
                          Solo hay {l.stock} en stock
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className={l.notes ? "text-primary" : "text-muted-foreground"}
                      onClick={() => setNoteOpenFor(noteOpenFor === l.productId ? null : l.productId)}
                      title="Nota del producto"
                    >
                      <StickyNote className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeLine(l.productId)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 pl-16 sm:grid-cols-5">
                    <div>
                      <p className="mb-1 text-[10px] uppercase text-muted-foreground">Cantidad</p>
                      <Input
                        type="number"
                        min={1}
                        value={l.quantity}
                        onChange={(e) =>
                          updateLine(l.productId, { quantity: Math.max(1, Number(e.target.value)) })
                        }
                        className="h-8 text-center"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] uppercase text-muted-foreground">P. unitario</p>
                      <Input
                        type="number"
                        min={0}
                        step={100}
                        value={l.unitPrice}
                        onChange={(e) =>
                          updateLine(l.productId, { unitPrice: Math.max(0, Number(e.target.value)) })
                        }
                        className="h-8 text-right"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] uppercase text-muted-foreground">% Desc.</p>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={l.discountPercent}
                        onChange={(e) =>
                          updateLine(l.productId, {
                            discountPercent: Math.min(100, Math.max(0, Number(e.target.value))),
                          })
                        }
                        className="h-8 text-right"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] uppercase text-muted-foreground">IVA (19%)</p>
                      <p className="flex h-8 items-center justify-end pr-2 text-sm tabular-nums text-muted-foreground">
                        {formatCLP(l.taxAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] uppercase text-muted-foreground">Total</p>
                      <p className="flex h-8 items-center justify-end pr-2 text-sm font-medium tabular-nums">
                        {formatCLP(l.total)}
                      </p>
                    </div>
                  </div>
                  {l.discountAmount > 0 && (
                    <p className="mt-1 pl-16 text-xs text-status-good">
                      Descuento aplicado: -{formatCLP(l.discountAmount)}
                    </p>
                  )}

                  {noteOpenFor === l.productId && (
                    <div className="mt-2 pl-16">
                      <Textarea
                        rows={2}
                        placeholder="Nota para este producto (ej. graduación, observación del cliente)"
                        value={l.notes}
                        onChange={(e) => updateLine(l.productId, { notes: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {computed.length > 0 && (
            <div className="space-y-1 border-t bg-muted/40 px-4 py-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{totalUnits} lente(s)</span>
                <span>Subtotal {formatCLP(subtotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex items-center justify-between text-xs text-status-good">
                  <span>Descuentos</span>
                  <span>-{formatCLP(totalDiscount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>IVA (19%)</span>
                <span>{formatCLP(taxAmount)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-1">
                <span className="text-sm font-medium">Total</span>
                <span className="text-lg font-semibold tabular-nums">{formatCLP(total)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {!isEdit && (
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {requiresConfirmation
                    ? "Requiere confirmación"
                    : "Descuenta inventario ahora"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {requiresConfirmation
                    ? "La venta queda registrada de inmediato, pero el stock solo se descuenta cuando un preparador confirme el pedido."
                    : "El stock se descuenta apenas registres esta venta."}
                </p>
              </div>
              <Switch
                checked={requiresConfirmation}
                onCheckedChange={setRequiresConfirmation}
              />
            </div>
          </div>
        )}

        {isEdit && (
          <div className="rounded-xl border border-dashed bg-muted/30 p-4 text-xs text-muted-foreground">
            Editar corrige los productos, precios y datos de la venta. El estado de
            confirmación no cambia aquí — usa los botones de la venta para eso. Si el
            inventario ya se había descontado, se ajusta automáticamente al guardar.
          </div>
        )}

        {isAdmin && !isEdit && (
          <div className="space-y-2 rounded-xl border bg-card p-4">
            <Label>Vendedor</Label>
            <Select
              items={Object.fromEntries(sellers.map((s) => [s.id, s.name]))}
              value={sellerId}
              onValueChange={(v) => setSellerId(v ?? currentUserId)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sellers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="rounded-xl border bg-card p-4">
          <CustomerPicker value={customer} onChange={setCustomer} />
        </div>

        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div className="space-y-2">
            <Label>Método de pago</Label>
            <Select
              items={Object.fromEntries(PAYMENT_METHODS.map((m) => [m, m]))}
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v ?? "Efectivo")}
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
            <Label htmlFor="notes">Notas generales</Label>
            <Textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles adicionales de la venta"
            />
          </div>
        </div>

        <Button className="w-full" size="lg" onClick={onSubmit} disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          {isEdit ? "Guardar cambios" : "Registrar venta"}{" "}
          {computed.length > 0 && `· ${formatCLP(total)}`}
        </Button>
      </div>
    </div>
  );
}
