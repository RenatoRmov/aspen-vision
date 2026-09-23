"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileUp, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createProductsBulk, type ProductImportInput } from "@/server/actions/products";

type ParsedRow = {
  name: string;
  model: string;
  barcode: string;
  brand: string;
  category: string;
  stock: number;
  error?: string;
  duplicate?: boolean;
};

type PreviewRow = ParsedRow & { selected: boolean };

export function ImportProductsDialog() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<PreviewRow[] | null>(null);

  const reset = () => {
    setFileName(null);
    setRows(null);
    setParsing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParsing(true);
    setRows(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/products/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo leer el archivo");
      setRows(
        (data.rows as ParsedRow[]).map((r) => ({
          ...r,
          selected: !r.error && !r.duplicate,
        })),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo leer el archivo");
      reset();
    } finally {
      setParsing(false);
    }
  };

  const toggleRow = (index: number) => {
    setRows((prev) =>
      prev
        ? prev.map((r, i) => (i === index && !r.error ? { ...r, selected: !r.selected } : r))
        : prev,
    );
  };

  const selectableCount = rows?.filter((r) => !r.error).length ?? 0;
  const selectedCount = rows?.filter((r) => r.selected).length ?? 0;
  const allSelected = selectableCount > 0 && selectedCount === selectableCount;

  const toggleAll = () => {
    setRows((prev) =>
      prev ? prev.map((r) => (r.error ? r : { ...r, selected: !allSelected })) : prev,
    );
  };

  const onConfirm = async () => {
    if (!rows) return;
    const items: ProductImportInput[] = rows
      .filter((r) => r.selected)
      .map((r) => ({
        name: r.name,
        model: r.model,
        barcode: r.barcode,
        brand: r.brand,
        category: r.category,
        stock: r.stock,
      }));
    if (items.length === 0) return;

    setSubmitting(true);
    try {
      const count = await createProductsBulk(items);
      toast.success(`${count} producto(s) cargados al inventario`);
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar el inventario");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileUp className="h-4 w-4" />
        Importar inventario
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Importar inventario</DialogTitle>
            <DialogDescription>
              Sube la planilla de stock (columnas Nombre, Modelo, Código de Barras,
              Categoría del producto y Stock). Las filas resumen de cada categoría se
              ignoran automáticamente y los productos ya cargados aparecen destildados.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.xltx"
                className="hidden"
                onChange={onFileChange}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing}
              >
                {parsing && <Loader2 className="animate-spin" />}
                Seleccionar archivo
              </Button>
              {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
            </div>

            {rows && (
              <>
                <p className="text-sm text-muted-foreground">
                  {rows.length} fila(s) leídas · {selectedCount} seleccionadas para cargar
                  {rows.some((r) => r.duplicate) &&
                    ` · ${rows.filter((r) => r.duplicate).length} ya existían (destildadas)`}
                  {rows.some((r) => r.error) &&
                    ` · ${rows.filter((r) => r.error).length} con error (no se pueden cargar)`}
                </p>
                <div className="max-h-[45vh] overflow-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleAll}
                            aria-label="Seleccionar todos"
                          />
                        </TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Marca</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Modelo</TableHead>
                        <TableHead>Código de barras</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, index) => (
                        <TableRow
                          key={index}
                          className={r.error ? "opacity-50" : r.duplicate ? "bg-muted/40" : ""}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={r.selected}
                              disabled={!!r.error}
                              onChange={() => toggleRow(index)}
                            />
                          </TableCell>
                          <TableCell className="max-w-48 truncate text-sm" title={r.name}>
                            {r.error ? (
                              <span className="flex items-center gap-1 text-status-critical">
                                <TriangleAlert className="h-3 w-3" />
                                {r.error}
                              </span>
                            ) : (
                              r.name
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{r.brand}</TableCell>
                          <TableCell className="text-sm">{r.category}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{r.model}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                            {r.barcode}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {r.stock}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={onConfirm} disabled={submitting || selectedCount === 0}>
              {submitting && <Loader2 className="animate-spin" />}
              Cargar {selectedCount || ""} al inventario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
