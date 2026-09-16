import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { canonicalRut } from "@/lib/rut";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_HEADER_SCAN_ROWS = 15;
const MAX_DATA_ROWS = 5000;

// Column names as they appear in the SII "Registro de Ventas" export. We only
// keep what Cobranzas needs — Nro/Tipo Doc/Tipo de Venta/Fecha Recepción/Fecha
// Acuse Recibo/Fecha Reclamo/Fecha/Monto Exento are part of that export but
// unused here, so they're simply not in this map and get skipped.
const HEADER_ALIASES: Record<string, keyof ParsedRow> = {
  "ciudad": "city",
  "rut cliente": "clientRut",
  "razon social": "businessName",
  "folio": "folio",
  "fecha docto": "documentDate",
  "monto neto": "netAmount",
  "monto iva": "taxAmount",
  "monto total": "totalAmount",
};
const REQUIRED_KEYS: (keyof ParsedRow)[] = ["folio", "documentDate", "totalAmount"];

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

function normalizeHeader(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "object" && "text" in value) return String(value.text ?? "");
  if (typeof value === "object" && "result" in value) return String(value.result ?? "");
  return String(value).trim();
}

function parseMoney(value: ExcelJS.CellValue): number {
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
function parseDate(value: ExcelJS.CellValue): Date | null {
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

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    return NextResponse.json(
      { error: "No se pudo leer el archivo. ¿Es un Excel (.xlsx) válido?" },
      { status: 400 },
    );
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return NextResponse.json({ error: "El archivo no tiene hojas" }, { status: 400 });
  }

  // Find the header row: real SII exports sometimes carry a title/metadata
  // row or two above it, so scan instead of assuming row 1.
  let headerRowNumber = -1;
  let columnMap = new Map<number, keyof ParsedRow>();
  for (let r = 1; r <= Math.min(MAX_HEADER_SCAN_ROWS, sheet.rowCount); r++) {
    const row = sheet.getRow(r);
    const map = new Map<number, keyof ParsedRow>();
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

  if (headerRowNumber === -1) {
    return NextResponse.json(
      {
        error:
          "No se encontraron las columnas esperadas (Folio, Fecha Docto, Monto Total, …). Revisa que sea la planilla exportada por el SII.",
      },
      { status: 400 },
    );
  }

  const rows: ParsedRow[] = [];
  const lastRow = Math.min(sheet.rowCount, headerRowNumber + MAX_DATA_ROWS);
  for (let r = headerRowNumber + 1; r <= lastRow; r++) {
    const row = sheet.getRow(r);
    if (row.cellCount === 0) continue;

    const raw: Partial<Record<keyof ParsedRow, ExcelJS.CellValue>> = {};
    for (const [colNumber, key] of columnMap) {
      raw[key] = row.getCell(colNumber).value;
    }

    const folio = cellText(raw.folio);
    if (!folio) continue; // blank row, likely trailing spacer

    const documentDate = parseDate(raw.documentDate ?? null);
    const netAmount = parseMoney(raw.netAmount ?? 0);
    const taxAmount = parseMoney(raw.taxAmount ?? 0);
    const totalAmount = parseMoney(raw.totalAmount ?? 0);

    let error: string | undefined;
    if (!documentDate) error = "Fecha Docto inválida";
    else if (!totalAmount) error = "Monto Total inválido";

    rows.push({
      city: cellText(raw.city),
      clientRut: canonicalRut(cellText(raw.clientRut)),
      businessName: cellText(raw.businessName),
      folio,
      documentDate: (documentDate ?? new Date(0)).toISOString(),
      netAmount,
      taxAmount,
      totalAmount,
      error,
    });
  }

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
