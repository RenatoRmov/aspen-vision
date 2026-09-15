import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeRut } from "@/lib/rut";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ customers: [] });

  const customers = await db.customer.findMany({
    where: {
      OR: [
        { name: { contains: q } },
        { rut: { contains: normalizeRut(q) } },
        { businessName: { contains: q } },
      ],
    },
    orderBy: { name: "asc" },
    take: 10,
  });

  return NextResponse.json({ customers });
}
