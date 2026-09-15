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
  const delivery = await db.ambassadorDelivery.findUnique({
    where: { id },
    include: {
      ambassador: true,
      deliveredBy: true,
      items: { include: { product: true } },
    },
  });
  if (!delivery) {
    return NextResponse.json({ error: "Entrega no encontrada" }, { status: 404 });
  }

  const element = createElement(MovementReceiptDocument, {
    docType: "Entrega a embajador",
    code: delivery.code,
    date: delivery.date,
    recipientLabel: "Embajador",
    recipientName: delivery.ambassador.name,
    recipientContact: delivery.ambassador.instagram || delivery.ambassador.email,
    responsibleName: delivery.deliveredBy.name,
    notes: delivery.notes,
    lines: delivery.items.map((item, idx) => ({
      position: idx + 1,
      description: `${item.product.name} — ${item.product.brand} ${item.product.model}`,
      quantity: item.quantity,
    })),
  });

  const buffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${delivery.code}.pdf"`,
    },
  });
}
