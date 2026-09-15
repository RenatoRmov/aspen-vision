import { NextResponse } from "next/server";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { MovementReceiptDocument } from "@/lib/pdf/receipt-document";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const warranty = await db.warranty.findUnique({
    where: { id },
    include: { product: true, responsible: true },
  });
  if (!warranty) {
    return NextResponse.json({ error: "Garantía no encontrada" }, { status: 404 });
  }

  const element = createElement(MovementReceiptDocument, {
    docType: "Comprobante de garantía",
    code: warranty.code,
    date: warranty.date,
    recipientLabel: "Cliente",
    recipientName: warranty.customerName,
    recipientContact: warranty.customerContact,
    responsibleName: warranty.responsible?.name ?? "—",
    reasonLabel: "Motivo de la garantía",
    reason: warranty.reason,
    notes: warranty.notes,
    lines: [
      {
        position: 1,
        description: `${warranty.product.name} — ${warranty.product.brand} ${warranty.product.model}`,
        quantity: warranty.quantity,
      },
    ],
  });

  const buffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${warranty.code}.pdf"`,
    },
  });
}
