"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { StockBadge } from "@/components/shared/stock-badge";
import { primaryImage } from "@/lib/product-images";
import type { Prisma } from "@/generated/prisma/client";

export type PickedProduct = {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  model: string;
  images: Prisma.JsonValue;
  stock: number;
  category: { name: string };
};

export function ProductPicker({
  onSelect,
  onlyInStock = true,
  placeholder = "Buscar por marca, modelo o código de barras…",
}: {
  onSelect: (product: PickedProduct) => void;
  onlyInStock?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
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

  useEffect(() => {
    if (!open) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query });
        if (onlyInStock) params.set("inStock", "1");
        const res = await fetch(`/api/products/search?${params}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setResults(data.products ?? []);
      } catch {
        // aborted or network error — ignore, next keystroke will retry
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(t);
  }, [query, open, onlyInStock]);

  const pick = (p: PickedProduct) => {
    onSelect(p);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div ref={anchorRef} className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={placeholder}
          className="pl-9 pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0.5 top-1/2 h-8 w-8 -translate-y-1/2"
          onClick={() => {
            setCameraOpen(true);
            setOpen(true);
          }}
          title="Escanear con cámara"
        >
          <Camera className="h-4 w-4" />
        </Button>
      </div>
      <PopoverContent
        anchor={anchorRef}
        align="start"
        className="w-[420px] p-0"
        initialFocus={false}
        finalFocus={false}
      >
        <div ref={contentRef} className="max-h-80 overflow-y-auto p-1.5">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && results.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {query
                ? "Sin resultados. Verifica el código o el nombre."
                : "Escribe para buscar productos."}
            </p>
          )}
          {!loading &&
            results.map((p) => {
              const img = primaryImage(p.images);
              return (
                <button
                  key={p.id}
                  onClick={() => pick(p)}
                  title={p.barcode}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted",
                  )}
                >
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-muted">
                    {img ? (
                      <Image src={img} alt="" fill className="object-cover" sizes="44px" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                        Sin foto
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    {/* Name repeats heavily across variants (e.g. "MORMAII
                    Óptico" alone covers hundreds of SKUs) and duplicates the
                    category shown before — model is what's actually printed
                    on the frame's tag and is what tells two rows apart. */}
                    <p className="truncate text-xs text-muted-foreground">
                      {p.brand} · {p.model}
                    </p>
                  </div>
                  <StockBadge stock={p.stock} compact />
                </button>
              );
            })}
        </div>
      </PopoverContent>

      {cameraOpen && (
        <BarcodeCameraCatcher
          onClose={() => setCameraOpen(false)}
          onCode={(code) => {
            setCameraOpen(false);
            setQuery(code);
            setOpen(true);
          }}
        />
      )}
    </Popover>
  );
}

function BarcodeCameraCatcher({
  onCode,
  onClose,
}: {
  onCode: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let controls: { stop: () => void } | undefined;
    let cancelled = false;
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        if (cancelled || !videoRef.current) return;
        controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (result) onCode(result.getText());
          },
        );
      } catch {
        onClose();
      }
    })();
    return () => {
      cancelled = true;
      controls?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm space-y-3 rounded-xl bg-card p-4 shadow-xl">
        <p className="text-sm font-medium">Escanea el código de barras</p>
        <div className="relative overflow-hidden rounded-lg bg-black">
          <video ref={videoRef} className="aspect-video w-full" muted />
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-14 -translate-y-1/2 rounded-md border-2 border-primary/80" />
        </div>
        <Button variant="secondary" className="w-full" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
