import { NextResponse } from "next/server";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { VentaReceiptDocument } from "@/lib/pdf/receipt-document";
import { getCompanyLogoSrc } from "@/lib/pdf/company-logo";
import { formatRut } from "@/lib/rut";
import { taxOf } from "@/lib/sale-totals";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const sale = await db.sale.findUnique({
    where: { id },
    include: {
      seller: true,
      customer: true,
      items: { include: { product: true }, orderBy: { position: "asc" } },
    },
  });
  if (!sale) {
    return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
  }

  const subtotal = sale.items.reduce((a, i) => a + i.subtotal, 0);
  const discountTotal = sale.items.reduce((a, i) => a + i.discountAmount, 0);
  // IVA is computed once for the whole sale, not per line — see
  // src/lib/sale-totals.ts.
  const taxAmount = taxOf(subtotal);
  const total = subtotal + taxAmount;
  const logoSrc = await getCompanyLogoSrc();

  const element = createElement(VentaReceiptDocument, {
    code: sale.code,
    date: sale.date,
    sellerName: sale.seller.name,
    customerName: sale.customer?.name,
    customerRut: sale.customer ? formatRut(sale.customer.rut) : undefined,
    customerBusinessName: sale.customer?.businessName,
    paymentMethod: sale.paymentMethod,
    notes: sale.notes,
    lines: sale.items.map((item, idx) => ({
      position: idx + 1,
      description: `${item.product.name} — ${item.product.brand} ${item.product.model}`,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent,
      discountAmount: item.discountAmount,
      subtotal: item.subtotal,
      notes: item.notes,
    })),
    subtotal,
    discountTotal,
    taxAmount,
    total,
    logoSrc,
  });

  const buffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${sale.code}.pdf"`,
    },
  });
}
