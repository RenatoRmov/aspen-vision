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

export function ProductFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  };

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  useEffect(() => {
    const t = setTimeout(() => {
      if (q !== (searchParams.get("q") ?? "")) update("q", q);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Input
        placeholder="Buscar por nombre, marca, modelo o código de barras…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="sm:max-w-xs"
      />

      <Select
        items={{
          all: "Toda disponibilidad",
          "in-stock": "Con stock",
          "low-stock": "Stock bajo",
          "out-of-stock": "Sin stock",
        }}
        value={searchParams.get("disp") ?? "all"}
        onValueChange={(v) => update("disp", v as string)}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Disponibilidad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toda disponibilidad</SelectItem>
          <SelectItem value="in-stock">Con stock</SelectItem>
          <SelectItem value="low-stock">Stock bajo</SelectItem>
          <SelectItem value="out-of-stock">Sin stock</SelectItem>
        </SelectContent>
      </Select>

      <Select
        items={{
          recent: "Recién actualizados",
          name: "Nombre (A-Z)",
          "stock-asc": "Stock (menor a mayor)",
          "stock-desc": "Stock (mayor a menor)",
        }}
        value={searchParams.get("sort") ?? "recent"}
        onValueChange={(v) => update("sort", v as string)}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Ordenar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recent">Recién actualizados</SelectItem>
          <SelectItem value="name">Nombre (A-Z)</SelectItem>
          <SelectItem value="stock-asc">Stock (menor a mayor)</SelectItem>
          <SelectItem value="stock-desc">Stock (mayor a menor)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
