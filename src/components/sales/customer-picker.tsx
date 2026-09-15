"use client";

import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { formatRut } from "@/lib/rut";

export type CustomerValue = {
  name: string;
  rut: string;
  businessName: string;
};

type CustomerMatch = { id: string; name: string; rut: string; businessName: string | null };

export function CustomerPicker({
  value,
  onChange,
}: {
  value: CustomerValue;
  onChange: (value: CustomerValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<CustomerMatch[]>([]);
  const anchorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (contentRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    abortRef.current?.abort();
    if (!value.rut || value.rut.length < 2) {
      const t = setTimeout(() => setMatches([]), 0);
      return () => clearTimeout(t);
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers/search?q=${encodeURIComponent(value.rut)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setMatches(data.customers ?? []);
      } catch {
        // ignore aborted/failed lookups
      }
    }, 200);
    return () => clearTimeout(t);
  }, [value.rut]);

  const pick = (c: CustomerMatch) => {
    onChange({ name: c.name, rut: c.rut, businessName: c.businessName ?? "" });
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2" ref={anchorRef}>
        <Label htmlFor="customer-rut">RUT del comprador</Label>
        <Input
          id="customer-rut"
          value={value.rut}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange({ ...value, rut: e.target.value });
            setOpen(true);
          }}
          onBlur={() => {
            if (value.rut) onChange({ ...value, rut: formatRut(value.rut) });
          }}
          placeholder="Ej. 12.345.678-9"
        />
      </div>

      <Popover open={open && matches.length > 0} onOpenChange={setOpen}>
        <PopoverContent
          anchor={anchorRef}
          align="start"
          className="w-80 p-1.5"
          initialFocus={false}
          finalFocus={false}
        >
          <div ref={contentRef}>
            <p className="px-2 py-1 text-xs text-muted-foreground">
              Clientes ya registrados
            </p>
            {matches.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pick(c)}
                className="flex w-full flex-col rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-muted"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">
                  {c.rut}
                  {c.businessName ? ` · ${c.businessName}` : ""}
                </span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="space-y-2">
        <Label htmlFor="customer-name">Nombre del comprador</Label>
        <Input
          id="customer-name"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="Nombre completo"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="customer-business">Razón social (opcional)</Label>
        <Input
          id="customer-business"
          value={value.businessName}
          onChange={(e) => onChange({ ...value, businessName: e.target.value })}
          placeholder="Para facturación a empresa"
        />
      </div>
    </div>
  );
}
