import { NextResponse } from "next/server";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getCollections, type CollectionFilters } from "@/server/queries/collections";
import { getCobranzaLogoSrc } from "@/lib/pdf/company-logo";
import {
  CollectionStatementDocument,
  type StatementClient,
} from "@/lib/pdf/collection-statement-document";
import { formatRut } from "@/lib/rut";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!can(session.user.role, "collections:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const filters: CollectionFilters = {
    estado: (searchParams.get("estado") ?? "all") as CollectionFilters["estado"],
    clientRut: searchParams.get("rut") ?? undefined,
    folio: searchParams.get("folio") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  };

  const allRows = await getCollections(filters);
  // The client statement only ever reminds people of what they still owe —
  // regardless of whatever Estado filter happens to be selected on screen.
  const pendingRows = allRows.filter((r) => r.estado === "PENDIENTE" || r.estado === "PARCIAL");

  const clientsMap = new Map<string, StatementClient>();
  for (const r of pendingRows) {
    const entry = clientsMap.get(r.clientRut) ?? {
      clientRut: formatRut(r.clientRut),
      businessName: r.businessName,
      accounts: [],
    };
    entry.accounts.push({
      folio: r.folio,
      documentDate: r.documentDate,
      netAmount: r.netAmount,
      taxAmount: r.taxAmount,
      totalAmount: r.totalAmount,
      totalPaid: r.totalPaid,
      saldo: r.saldo,
    });
    clientsMap.set(r.clientRut, entry);
  }
  let clients = [...clientsMap.values()];

  if (clients.length === 0) {
    if (filters.clientRut && allRows.length > 0) {
      // A specific client was requested and simply has nothing pending —
      // still hand back a one-page "sin deuda" statement instead of an error.
      const sample = allRows[0];
      clients = [{ clientRut: formatRut(sample.clientRut), businessName: sample.businessName, accounts: [] }];
    } else {
      return NextResponse.json(
        { error: "No hay cuentas pendientes para exportar con estos filtros" },
        { status: 400 },
      );
    }
  }

  const logoSrc = await getCobranzaLogoSrc();
  const element = createElement(CollectionStatementDocument, {
    clients,
    logoSrc,
    generatedAt: new Date(),
  });

  const buffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cobranzas-${stamp}.pdf"`,
    },
  });
}
