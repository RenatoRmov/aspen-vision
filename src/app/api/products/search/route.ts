import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const onlyInStock = searchParams.get("inStock") === "1";

  if (!q) {
    const products = await db.product.findMany({
      where: { active: true, ...(onlyInStock ? { stock: { gt: 0 } } : {}) },
      orderBy: { updatedAt: "desc" },
      take: 12,
      include: { category: true },
    });
    return NextResponse.json({ products });
  }

  // Multi-word queries ("ray-ban aviator") must match across brand+model
  // together, not as one literal substring of a single column — so every
  // token independently has to appear somewhere in barcode/brand/model.
  const tokens = q.split(/\s+/).filter(Boolean);

  const products = await db.product.findMany({
    where: {
      active: true,
      ...(onlyInStock ? { stock: { gt: 0 } } : {}),
      AND: tokens.map((token) => ({
        OR: [
          { barcode: { contains: token } },
          { name: { contains: token } },
          { brand: { contains: token } },
          { model: { contains: token } },
        ],
      })),
    },
    orderBy: [{ stock: "desc" }, { name: "asc" }],
    take: 20,
    include: { category: true },
  });

  return NextResponse.json({ products });
}
