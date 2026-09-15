"use client";

import { useEffect, useRef, useState } from "react";
import { Barcode, Camera, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Fast barcode entry: works with a keyboard-emulating handheld scanner (just
 * focus + type + Enter), plain manual typing, or the device camera via
 * @zxing/browser. This is the single entry point used everywhere a barcode
 * needs to resolve to a product (sales, ambassador deliveries, warranties,
 * inventory search).
 */
export function BarcodeScanInput({
  onScan,
  placeholder = "Escanea o escribe el código de barras…",
  autoFocus = false,
  className,
}: {
  onScan: (code: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const code = value.trim();
    if (!code) return;
    onScan(code);
    setValue("");
  };

  return (
    <>
      <div className={cn("flex items-center gap-2", className)}>
        <div className="relative flex-1">
          <Barcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            autoFocus={autoFocus}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={placeholder}
            className="pl-9"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          title="Escanear con cámara"
          onClick={() => setCameraOpen(true)}
        >
          <Camera className="h-4 w-4" />
        </Button>
      </div>

      <CameraScanDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onDetected={(code) => {
          setCameraOpen(false);
          onScan(code);
        }}
      />
    </>
  );
}

function CameraScanDialog({
  open,
  onOpenChange,
  onDetected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
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
            if (result) onDetected(result.getText());
          },
        );
      } catch {
        setError(
          "No se pudo acceder a la cámara. Revisa los permisos del navegador.",
        );
      }
    })();

    return () => {
      cancelled = true;
      controls?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escanear código de barras</DialogTitle>
        </DialogHeader>
        {error ? (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : (
          <div className="relative overflow-hidden rounded-lg bg-black">
            <video ref={videoRef} className="aspect-video w-full" muted />
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-16 -translate-y-1/2 rounded-md border-2 border-primary/80" />
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Apunta la cámara al código de barras del lente. La detección es
          automática.
        </p>
        <Button
          variant="secondary"
          onClick={() => onOpenChange(false)}
          className="w-full"
        >
          <X className="h-4 w-4" /> Cancelar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
