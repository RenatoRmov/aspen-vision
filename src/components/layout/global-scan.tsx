"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Barcode, Loader2 } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { StockBadge } from "@/components/shared/stock-badge";

type Result = {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  model: string;
  stock: number;
  category: { name: string };
};

export function GlobalScan() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.products ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => search(query), 200);
    return () => clearTimeout(t);
  }, [query, open, search]);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-9 w-full max-w-sm justify-start gap-2 text-muted-foreground sm:w-64"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Buscar o escanear producto…</span>
        <span className="sm:hidden">Buscar…</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline">
          Ctrl K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen} title="Buscar producto">
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Escanea un código o escribe marca / modelo…"
        />
        <CommandList>
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && <CommandEmpty>Sin resultados.</CommandEmpty>}
          {!loading && (
            <CommandGroup heading="Productos">
              {results.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.name} ${p.brand} ${p.model} ${p.barcode}`}
                  onSelect={() => {
                    setOpen(false);
                    router.push(`/inventario/${p.id}`);
                  }}
                  className="flex items-center gap-2"
                >
                  <Barcode className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">
                    {p.name || `${p.brand} ${p.model}`}{" "}
                    <span className="text-muted-foreground">
                      · {p.barcode}
                    </span>
                  </span>
                  <StockBadge stock={p.stock} compact />
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
