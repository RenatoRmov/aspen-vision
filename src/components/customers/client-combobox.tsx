"use client";

import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { formatRut } from "@/lib/rut";

type ClientMatch = { id: string; name: string; rut: string; businessName: string | null };

/** Search-and-pick an EXISTING client by name/RUT — unlike Ventas'
 * CustomerPicker (which creates-or-matches inline), this only ever selects
 * an already-known client, for "Registrar visita" from the Hoy dashboard. */
export function ClientCombobox({
  value,
  onChange,
}: {
  value: ClientMatch | null;
  onChange: (value: ClientMatch | null) => void;
}) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<ClientMatch[]>([]);
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
    if (!query || query.length < 2) {
      const t = setTimeout(() => setMatches([]), 0);
      return () => clearTimeout(t);
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setMatches(data.customers ?? []);
      } catch {
        // ignore aborted/failed lookups
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const pick = (c: ClientMatch) => {
    onChange(c);
    setQuery(c.name);
    setOpen(false);
  };

  return (
    <div className="space-y-2" ref={anchorRef}>
      <Label htmlFor="client-combobox">Cliente</Label>
      <Input
        id="client-combobox"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          if (value) onChange(null);
          setOpen(true);
        }}
        placeholder="Buscar por nombre o RUT…"
        autoComplete="off"
      />
      <Popover open={open && matches.length > 0} onOpenChange={setOpen}>
        <PopoverContent
          anchor={anchorRef}
          align="start"
          className="w-80 p-1.5"
          initialFocus={false}
          finalFocus={false}
        >
          <div ref={contentRef}>
            {matches.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pick(c)}
                className="flex w-full flex-col rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-muted"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatRut(c.rut)}
                  {c.businessName ? ` · ${c.businessName}` : ""}
                </span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
