"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2, ChevronUp, ChevronDown, StickyNote, Pencil } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductPicker, type PickedProduct } from "@/components/shared/product-picker";
import { CustomerPicker, type CustomerValue } from "@/components/sales/customer-picker";
import { primaryImage } from "@/lib/product-images";
import { formatCLP } from "@/lib/format";
import { formatRut, isValidRut } from "@/lib/rut";
import { cn } from "@/lib/utils";
import { createSale, updateSale } from "@/server/actions/sales";
import { taxOf } from "@/lib/sale-totals";

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
  const [customer, setCustomer] = useState<CustomerValue>(
    initialSale?.customer ?? { name: "", rut: "", businessName: "" },
  );
  // New sales require an identified customer before products can be added —
  // editing an existing sale never re-gates this (its customer is already set).
  const [customerLocked, setCustomerLocked] = useState(isEdit);
  // Checksum-validate the RUT only for a brand-new customer (catches a typo
  // before it becomes a permanent record) — an already-matched existing
  // customer is trusted as-is, since some real historical records predate
  // that validation and shouldn't get blocked from selling to them again.
  const customerReady =
    customer.name.trim() !== "" &&
    (customer.id ? customer.rut.trim() !== "" : isValidRut(customer.rut));
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
        return { ...l, discountAmount, subtotal };
      }),
    [lines],
  );

  const subtotal = computed.reduce((s, l) => s + l.subtotal, 0);
  // IVA is computed once for the whole sale, not accumulated per line — see
  // src/lib/sale-totals.ts.
  const taxAmount = taxOf(subtotal);
  const total = subtotal + taxAmount;
  const totalUnits = computed.reduce((s, l) => s + l.quantity, 0);
  const totalDiscount = computed.reduce((s, l) => s + l.discountAmount, 0);

  const onSubmit = async () => {
    if (!isEdit && !customerReady) {
      toast.error("Selecciona o registra un cliente antes de continuar");
      return;
    }
    if (lines.length === 0) {
      toast.error("Agrega al menos un producto a la venta");
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

  if (!isEdit && !customerLocked) {
    return (
      <div className="mx-auto max-w-md space-y-1">
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold">¿Quién es el cliente?</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Busca por RUT o nombre para autocompletar un cliente ya registrado. Si es
            nuevo, complétalo aquí — se registrará junto con la venta.
          </p>
          <CustomerPicker value={customer} onChange={setCustomer} />
          {!customer.id && customer.rut && !isValidRut(customer.rut) && (
            <p className="mt-2 text-xs text-status-critical">RUT inválido</p>
          )}
          <Button
            type="button"
            className="mt-4 w-full"
            disabled={!customerReady}
            onClick={() => setCustomerLocked(true)}
          >
            Continuar
          </Button>
        </div>
      </div>
    );
  }

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-6" />
                  <TableHead className="w-6 text-xs">#</TableHead>
                  <TableHead className="text-xs">Producto</TableHead>
                  <TableHead className="w-20 text-right text-xs">Cant.</TableHead>
                  <TableHead className="w-28 text-right text-xs">P. unitario</TableHead>
                  <TableHead className="w-20 text-right text-xs">% Desc.</TableHead>
                  <TableHead className="w-28 text-right text-xs">Precio</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {computed.map((l, index) => (
                  <Fragment key={l.productId}>
                    <TableRow className="[&>td]:py-1.5">
                      <TableCell className="p-0 pl-2">
                        <div className="flex flex-col">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveLine(index, -1)}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={index === computed.length - 1}
                            onClick={() => moveLine(index, 1)}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="whitespace-normal">
                        <p className="text-sm leading-tight font-medium">{l.name}</p>
                        <p className="text-xs leading-tight text-muted-foreground">
                          {l.brand} {l.model}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={l.quantity}
                          onChange={(e) =>
                            updateLine(l.productId, { quantity: Math.max(1, Number(e.target.value)) })
                          }
                          className="h-8 text-right"
                        />
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums">
                        {formatCLP(l.subtotal)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className={l.notes ? "text-primary" : "text-muted-foreground"}
                            onClick={() =>
                              setNoteOpenFor(noteOpenFor === l.productId ? null : l.productId)
                            }
                            title="Nota del producto"
                          >
                            <StickyNote className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeLine(l.productId)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {l.discountAmount > 0 && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={8} className="py-0.5 pt-0 text-right text-xs text-status-good">
                          Descuento aplicado: -{formatCLP(l.discountAmount)}
                        </TableCell>
                      </TableRow>
                    )}
                    {noteOpenFor === l.productId && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={8} className="bg-muted/30 py-2">
                          <Textarea
                            rows={2}
                            placeholder="Nota para este producto (ej. graduación, observación del cliente)"
                            value={l.notes}
                            onChange={(e) => updateLine(l.productId, { notes: e.target.value })}
                            className="bg-background text-sm"
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
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
          <div className="rounded-xl border border-dashed bg-muted/30 p-4 text-xs text-muted-foreground">
            La venta queda registrada de inmediato, pero el stock solo se descuenta
            cuando un preparador confirme el pedido.
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
          {!isEdit ? (
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{customer.name}</p>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                      customer.id
                        ? "bg-status-good/10 text-status-good"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    {customer.id ? "Cliente existente" : "Cliente nuevo"}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {formatRut(customer.rut)}
                  {customer.businessName ? ` · ${customer.businessName}` : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setCustomerLocked(false)}
                title="Cambiar cliente"
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <CustomerPicker value={customer} onChange={setCustomer} />
          )}
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
