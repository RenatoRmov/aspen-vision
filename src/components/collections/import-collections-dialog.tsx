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
import { formatCLP, formatDateOnly } from "@/lib/format";
import { formatRut } from "@/lib/rut";
import { createCollectionsBulk, type CollectionInput } from "@/server/actions/collections";

type ParsedRow = {
  city: string;
  clientRut: string;
  businessName: string;
  folio: string;
  documentDate: string;
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
  error?: string;
  duplicate?: boolean;
};

type PreviewRow = ParsedRow & { selected: boolean };

export function ImportCollectionsDialog() {
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
      const res = await fetch("/api/collections/import", {
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
    const items: CollectionInput[] = rows
      .filter((r) => r.selected)
      .map((r) => ({
        city: r.city,
        clientRut: r.clientRut,
        businessName: r.businessName,
        folio: r.folio,
        documentDate: new Date(r.documentDate),
        netAmount: r.netAmount,
        taxAmount: r.taxAmount,
        totalAmount: r.totalAmount,
      }));
    if (items.length === 0) return;

    setSubmitting(true);
    try {
      const count = await createCollectionsBulk(items);
      toast.success(`${count} cobranza(s) cargadas a la tabla`);
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar la información");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileUp className="h-4 w-4" />
        Importar Excel
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Importar Excel del SII</DialogTitle>
            <DialogDescription>
              Sube el registro de ventas exportado desde el SII. Se leen Ciudad, Rut
              Cliente, Razón Social, Folio, Fecha Docto, Monto Neto, Monto IVA y Monto
              Total — el resto de las columnas se ignora.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
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
                        <TableHead>Ciudad</TableHead>
                        <TableHead>Rut Cliente</TableHead>
                        <TableHead>Razón Social</TableHead>
                        <TableHead>Folio</TableHead>
                        <TableHead>Fecha Docto</TableHead>
                        <TableHead className="text-right">Monto Neto</TableHead>
                        <TableHead className="text-right">Monto IVA</TableHead>
                        <TableHead className="text-right">Monto Total</TableHead>
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
                          <TableCell className="text-sm">{r.city || "—"}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {r.clientRut ? formatRut(r.clientRut) : "—"}
                          </TableCell>
                          <TableCell className="max-w-40 truncate text-sm" title={r.businessName}>
                            {r.businessName || "—"}
                          </TableCell>
                          <TableCell className="text-sm">{r.folio}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                            {r.error ? (
                              <span className="flex items-center gap-1 text-status-critical">
                                <TriangleAlert className="h-3 w-3" />
                                {r.error}
                              </span>
                            ) : (
                              formatDateOnly(r.documentDate)
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {formatCLP(r.netAmount)}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {formatCLP(r.taxAmount)}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium tabular-nums">
                            {formatCLP(r.totalAmount)}
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
              Cargar {selectedCount || ""} a la tabla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
