import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { canonicalRut } from "@/lib/rut";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_HEADER_SCAN_ROWS = 15;
const MAX_DATA_ROWS = 5000;

type ParsedRow = {
  city: string;
  clientRut: string;
  businessName: string;
  folio: string;
  documentDate: string; // ISO date
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
  error?: string;
  duplicate?: boolean;
};

// "tipoDoc" is only read to filter out non-invoice documents (see
// ACCEPTED_DOC_TYPES below) — it never ends up in the ParsedRow the client
// sees, so it's a separate key from the fields that actually get imported.
type RawKey = keyof ParsedRow | "tipoDoc";

// Column names as they appear in the SII "Registro de Ventas" export (both
// the .xlsx and the RCV .csv formats use the same column names). We only
// keep what Cobranzas needs — Nro/Tipo de Venta/Fecha Recepción/Fecha Acuse
// Recibo/Fecha Reclamo/Monto Exento/etc. are part of that export but unused
// here, so they're simply not in this map and get skipped.
const HEADER_ALIASES: Record<string, RawKey> = {
  "ciudad": "city",
  "rut cliente": "clientRut",
  "razon social": "businessName",
  "folio": "folio",
  "fecha docto": "documentDate",
  "monto neto": "netAmount",
  "monto iva": "taxAmount",
  "monto total": "totalAmount",
  "tipo doc": "tipoDoc",
};
const REQUIRED_KEYS: (keyof ParsedRow)[] = ["folio", "documentDate", "totalAmount"];

// The SII's raw "Registro de Compra y Venta" export lists every document
// type issued (boletas, guías de despacho, notas de crédito/débito...), not
// just invoices. Only real sale invoices belong in Cobranzas as a new debt —
// a Nota de Crédito reduces an existing document's debt instead (that's
// exactly what this app's own "Nota de Crédito" feature is for), so importing
// one here as if it were a fresh invoice would double-count or misrepresent
// what the client actually owes. Rows with any other "Tipo Doc" are flagged
// with an error instead (same as an invalid date/amount) so they show up
// grayed out, unchecked, in the preview rather than silently vanishing.
const ACCEPTED_DOC_TYPES = new Set(["33", "34"]); // Factura / Factura Exenta Electrónica
const DOC_TYPE_LABELS: Record<string, string> = {
  "39": "Boleta Electrónica",
  "41": "Boleta Exenta Electrónica",
  "46": "Factura de Compra Electrónica",
  "52": "Guía de Despacho Electrónica",
  "56": "Nota de Débito Electrónica",
  "61": "Nota de Crédito Electrónica",
  "110": "Factura de Exportación",
  "111": "Nota de Débito de Exportación",
  "112": "Nota de Crédito de Exportación",
};

function normalizeHeader(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

function cellText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object" && "text" in value) return String(value.text ?? "");
  if (typeof value === "object" && "result" in value) return String(value.result ?? "");
  return String(value).trim();
}

function parseMoney(value: unknown): number {
  if (typeof value === "number") return Math.round(value);
  if (typeof value === "object" && value && "result" in value) {
    return Math.round(Number(value.result) || 0);
  }
  const text = cellText(value).replace(/[^\d,.-]/g, "");
  if (!text) return 0;
  // Chilean numbers use '.' as thousands separator; strip it, keep a
  // trailing ',' as the decimal separator (amounts here are integer CLP).
  const cleaned = text.replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  return Math.round(Number(cleaned) || 0);
}

// Fecha Docto is a pure calendar date (no meaningful time-of-day), so it's
// always anchored at UTC midnight — the same convention a plain <input
// type="date"> produces — and always displayed with formatDateOnly (which
// reads UTC components). That keeps the calendar day stable regardless of
// which timezone the server or a viewer's browser happens to be in.
function parseDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }
  if (typeof value === "number") {
    // Excel serial date (days since 1899-12-30), rare here but handled just in case.
    return new Date(Date.UTC(1899, 11, 30) + value * 86400000);
  }
  const text = cellText(value);
  const m = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (m) {
    const [, d, mo, y] = m;
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    const date = new Date(Date.UTC(year, Number(mo) - 1, Number(d)));
    if (!Number.isNaN(date.getTime())) return date;
  }
  const fallback = new Date(text);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

/** Shared by both the Excel and CSV paths — builds one ParsedRow from a raw
 * cell map, applying the same date/amount/doc-type validation either way. */
function buildRow(raw: Partial<Record<RawKey, unknown>>): ParsedRow | null {
  const folio = cellText(raw.folio);
  if (!folio) return null; // blank row, likely trailing spacer

  const documentDate = parseDate(raw.documentDate ?? null);
  const netAmount = parseMoney(raw.netAmount ?? 0);
  const taxAmount = parseMoney(raw.taxAmount ?? 0);
  const totalAmount = parseMoney(raw.totalAmount ?? 0);
  const tipoDoc = cellText(raw.tipoDoc);

  let error: string | undefined;
  if (tipoDoc && !ACCEPTED_DOC_TYPES.has(tipoDoc)) {
    error = `Tipo de documento no soportado (${DOC_TYPE_LABELS[tipoDoc] ?? `Tipo ${tipoDoc}`})`;
  } else if (!documentDate) {
    error = "Fecha Docto inválida";
  } else if (!totalAmount) {
    error = "Monto Total inválido";
  }

  return {
    city: cellText(raw.city),
    clientRut: canonicalRut(cellText(raw.clientRut)),
    businessName: cellText(raw.businessName),
    folio,
    documentDate: (documentDate ?? new Date(0)).toISOString(),
    netAmount,
    taxAmount,
    totalAmount,
    error,
  };
}

function parseExcel(workbook: ExcelJS.Workbook): { rows: ParsedRow[]; headerFound: boolean } {
  const sheet = workbook.worksheets[0];
  if (!sheet) return { rows: [], headerFound: false };

  // Find the header row: real SII exports sometimes carry a title/metadata
  // row or two above it, so scan instead of assuming row 1.
  let headerRowNumber = -1;
  let columnMap = new Map<number, RawKey>();
  for (let r = 1; r <= Math.min(MAX_HEADER_SCAN_ROWS, sheet.rowCount); r++) {
    const row = sheet.getRow(r);
    const map = new Map<number, RawKey>();
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const key = HEADER_ALIASES[normalizeHeader(cellText(cell.value))];
      if (key) map.set(colNumber, key);
    });
    const foundKeys = new Set(map.values());
    if (REQUIRED_KEYS.every((k) => foundKeys.has(k))) {
      headerRowNumber = r;
      columnMap = map;
      break;
    }
  }
  if (headerRowNumber === -1) return { rows: [], headerFound: false };

  const rows: ParsedRow[] = [];
  const lastRow = Math.min(sheet.rowCount, headerRowNumber + MAX_DATA_ROWS);
  for (let r = headerRowNumber + 1; r <= lastRow; r++) {
    const row = sheet.getRow(r);
    if (row.cellCount === 0) continue;

    const raw: Partial<Record<RawKey, unknown>> = {};
    for (const [colNumber, key] of columnMap) {
      raw[key] = row.getCell(colNumber).value;
    }
    const parsed = buildRow(raw);
    if (parsed) rows.push(parsed);
  }
  return { rows, headerFound: true };
}

// SII's RCV CSV export is semicolon-delimited and doesn't quote/escape values
// (none of the fields we read ever contain a literal ';'), so a plain split
// is safe here without pulling in a CSV parsing library for one file format.
function parseCsv(text: string): { rows: ParsedRow[]; headerFound: boolean } {
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r\n|\r|\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split(";"));

  let headerRowIndex = -1;
  let columnMap = new Map<number, RawKey>();
  for (let r = 0; r < Math.min(MAX_HEADER_SCAN_ROWS, lines.length); r++) {
    const map = new Map<number, RawKey>();
    lines[r].forEach((cell, colNumber) => {
      const key = HEADER_ALIASES[normalizeHeader(cell)];
      if (key) map.set(colNumber, key);
    });
    const foundKeys = new Set(map.values());
    if (REQUIRED_KEYS.every((k) => foundKeys.has(k))) {
      headerRowIndex = r;
      columnMap = map;
      break;
    }
  }
  if (headerRowIndex === -1) return { rows: [], headerFound: false };

  const rows: ParsedRow[] = [];
  const lastRow = Math.min(lines.length, headerRowIndex + 1 + MAX_DATA_ROWS);
  for (let r = headerRowIndex + 1; r < lastRow; r++) {
    const cells = lines[r];
    const raw: Partial<Record<RawKey, unknown>> = {};
    for (const [colNumber, key] of columnMap) {
      raw[key] = cells[colNumber];
    }
    const parsed = buildRow(raw);
    if (parsed) rows.push(parsed);
  }
  return { rows, headerFound: true };
}

/** Some SII exports are Latin-1 rather than UTF-8 — retry with that encoding
 * if the UTF-8 decode produced replacement characters, a strong signal of
 * having picked the wrong one. */
function decodeCsvBuffer(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  if (!utf8.includes("�")) return utf8;
  return new TextDecoder("iso-8859-1").decode(buffer);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!can(session.user.role, "collections:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo no válido" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "El archivo supera los 10MB permitidos." }, { status: 400 });
  }

  const isCsv = file.name.toLowerCase().endsWith(".csv");

  let parsed: { rows: ParsedRow[]; headerFound: boolean };
  if (isCsv) {
    const text = decodeCsvBuffer(await file.arrayBuffer());
    parsed = parseCsv(text);
  } else {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(await file.arrayBuffer());
    } catch {
      return NextResponse.json(
        { error: "No se pudo leer el archivo. ¿Es un Excel (.xlsx) o CSV válido?" },
        { status: 400 },
      );
    }
    parsed = parseExcel(workbook);
  }

  if (!parsed.headerFound) {
    return NextResponse.json(
      {
        error:
          "No se encontraron las columnas esperadas (Folio, Fecha Docto, Monto Total, …). Revisa que sea la planilla o el CSV exportado por el SII.",
      },
      { status: 400 },
    );
  }

  const rows = parsed.rows;

  // Flag folios already present so the user doesn't accidentally double-load
  // the same SII export (folio isn't a hard unique key in the schema, since
  // that's not guaranteed across clients, but it's a solid duplicate signal).
  const folios = [...new Set(rows.map((r) => r.folio))];
  if (folios.length > 0) {
    const existing = await db.collection.findMany({
      where: { folio: { in: folios } },
      select: { folio: true, clientRut: true },
    });
    const existingKeys = new Set(existing.map((e) => `${e.folio}::${e.clientRut}`));
    for (const row of rows) {
      if (existingKeys.has(`${row.folio}::${row.clientRut}`)) row.duplicate = true;
    }
  }

  return NextResponse.json({ rows });
}
