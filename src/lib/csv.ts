import Papa from "papaparse";
import { NextResponse } from "next/server";

export function csvResponse(filename: string, rows: Record<string, unknown>[]) {
  const csv = Papa.unparse(rows, { header: true });
  // Prefix a BOM so Excel on Windows opens UTF-8 accented characters correctly.
  const body = "﻿" + csv;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
