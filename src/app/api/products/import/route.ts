import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_HEADER_SCAN_ROWS = 15;
const MAX_DATA_ROWS = 10000;

type RawKey = "name" | "model" | "barcode" | "category" | "stock";

const HEADER_ALIASES: Record<string, RawKey> = {
  "nombre": "name",
  "modelo": "model",
  "codigo de barras": "barcode",
  "categoria del producto": "category",
  "stock": "stock",
};
const REQUIRED_KEYS: RawKey[] = ["name", "category", "stock"];

// Multi-word / non-obvious brands that a "first word of the category" guess
// would get wrong — everything else falls back to that guess, so a future
// file with a brand not in this list still imports instead of erroring out.
const BRAND_OVERRIDES: Record<string, string> = {
  "aspen iris": "Aspen",
  "frida kahlo sol": "Frida Kahlo",
  "frida kahlo optico": "Frida Kahlo",
  "nina ricci sol": "Nina Ricci",
  "nina ricci optico": "Nina Ricci",
  "mercaderia economica": "Mercadería Económica",
};

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

function normalizeHeader(raw: string): string {
  return raw.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

function slug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cellText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object" && "text" in value) return String(value.text ?? "");
  if (typeof value === "object" && "result" in value) return String(value.result ?? "");
  return String(value).trim();
}

function cellInt(value: unknown): number {
  if (typeof value === "number") return Math.max(0, Math.trunc(value));
  if (typeof value === "object" && value && "result" in value) {
    return Math.max(0, Math.trunc(Number(value.result) || 0));
  }
  const n = Number(cellText(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

/** A real EAN/UPC barcode is 8+ digits. Shorter values found in the source
 * file are internal reference numbers, not scannable barcodes — treated the
 * same as a missing barcode. */
function isRealBarcode(text: string): boolean {
  return /^\d{8,}$/.test(text);
}

function brandFor(category: string): string {
  const key = normalizeHeader(category);
  if (BRAND_OVERRIDES[key]) return BRAND_OVERRIDES[key];
  return category.trim().split(/\s+/)[0] || category;
}

function parseExcel(workbook: ExcelJS.Workbook): { rows: ParsedRow[]; headerFound: boolean } {
  const sheet = workbook.worksheets[0];
  if (!sheet) return { rows: [], headerFound: false };

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
  const usedBarcodes = new Set<string>();
  const lastRow = Math.min(sheet.rowCount, headerRowNumber + MAX_DATA_ROWS);
  for (let r = headerRowNumber + 1; r <= lastRow; r++) {
    const row = sheet.getRow(r);
    if (row.cellCount === 0) continue;

    const raw: Partial<Record<RawKey, unknown>> = {};
    for (const [colNumber, key] of columnMap) {
      raw[key] = row.getCell(colNumber).value;
    }

    // Summary/title rows (one per category, totalling the detail rows below
    // it) never have a category of their own — that's exactly what marks
    // them as a total, not a product, so they're skipped rather than shown
    // as an error.
    const category = cellText(raw.category).trim();
    if (!category) continue;

    const name = cellText(raw.name).trim();
    const model = cellText(raw.model).trim() || name;
    const stock = cellInt(raw.stock);
    const rawBarcode = cellText(raw.barcode).trim();
    const barcode = isRealBarcode(rawBarcode) ? rawBarcode : `SC-${slug(category)}-${slug(model)}`;

    let error: string | undefined;
    if (!name) error = "Nombre inválido";
    else if (usedBarcodes.has(barcode)) error = "Producto duplicado en el archivo";

    if (!error) usedBarcodes.add(barcode);

    rows.push({
      name,
      model,
      barcode,
      brand: brandFor(category),
      category,
      stock,
      error,
    });
  }
  return { rows, headerFound: true };
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!can(session.user.role, "inventory:manage")) {
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
      { error: "No se pudo leer el archivo. ¿Es un Excel (.xlsx/.xltx) válido?" },
      { status: 400 },
    );
  }
  const parsed = parseExcel(workbook);

  if (!parsed.headerFound) {
    return NextResponse.json(
      {
        error:
          "No se encontraron las columnas esperadas (Nombre, Categoría del producto, Stock, …).",
      },
      { status: 400 },
    );
  }

  const rows = parsed.rows;

  const barcodes = [...new Set(rows.map((r) => r.barcode))];
  if (barcodes.length > 0) {
    const existing = await db.product.findMany({
      where: { barcode: { in: barcodes } },
      select: { barcode: true },
    });
    const existingSet = new Set(existing.map((e) => e.barcode));
    for (const row of rows) {
      if (existingSet.has(row.barcode)) row.duplicate = true;
    }
  }

  return NextResponse.json({ rows });
}
