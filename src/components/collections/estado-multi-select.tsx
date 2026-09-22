"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { ESTADO_LABEL, type CollectionEstado } from "@/lib/collections";

const ESTADOS = Object.keys(ESTADO_LABEL) as CollectionEstado[];

/** Multi-select Estado filter — lets several estados be checked at once
 * instead of only one, so e.g. Pendiente + Parcial can be viewed together. */
export function EstadoMultiSelect({
  value,
  onChange,
}: {
  value: CollectionEstado[];
  onChange: (value: CollectionEstado[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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

  const toggle = (estado: CollectionEstado) => {
    if (value.includes(estado)) onChange(value.filter((e) => e !== estado));
    else onChange([...value, estado]);
  };

  const label =
    value.length === 0
      ? "Todos los estados"
      : value.length === 1
        ? ESTADO_LABEL[value[0]]
        : `${value.length} estados`;

  return (
    <div ref={anchorRef}>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between font-normal sm:w-44"
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverContent anchor={anchorRef} align="start" className="w-48 p-1.5">
          <div ref={contentRef} className="space-y-0.5">
            {ESTADOS.map((estado) => (
              <label
                key={estado}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <Checkbox
                  checked={value.includes(estado)}
                  onCheckedChange={() => toggle(estado)}
                />
                {ESTADO_LABEL[estado]}
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
