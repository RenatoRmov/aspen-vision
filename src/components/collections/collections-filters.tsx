"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ESTADO_LABEL } from "@/lib/collections";

const ESTADO_OPTIONS: Record<string, string> = {
  all: "Todos los estados",
  ...ESTADO_LABEL,
};

export function CollectionsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  };

  const [rut, setRut] = useState(searchParams.get("rut") ?? "");
  const [folio, setFolio] = useState(searchParams.get("folio") ?? "");
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  useEffect(() => {
    const t = setTimeout(() => {
      if (rut !== (searchParams.get("rut") ?? "")) update("rut", rut || null);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rut]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (folio !== (searchParams.get("folio") ?? "")) update("folio", folio || null);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folio]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (from !== (searchParams.get("from") ?? "")) update("from", from || null);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (to !== (searchParams.get("to") ?? "")) update("to", to || null);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Select
        items={ESTADO_OPTIONS}
        value={searchParams.get("estado") ?? "all"}
        onValueChange={(v) => update("estado", v === "all" ? null : (v ?? null))}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(ESTADO_OPTIONS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        placeholder="Rut cliente"
        value={rut}
        onChange={(e) => setRut(e.target.value)}
        className="sm:max-w-40"
      />
      <Input
        placeholder="Folio"
        value={folio}
        onChange={(e) => setFolio(e.target.value)}
        className="sm:max-w-32"
      />

      <div className="flex items-center gap-1.5">
        <label className="text-xs text-muted-foreground">Desde</label>
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-full sm:w-40"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-muted-foreground">Hasta</label>
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-full sm:w-40"
        />
      </div>
    </div>
  );
}
