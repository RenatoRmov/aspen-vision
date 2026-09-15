import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { code } = await params;
  const product = await db.product.findUnique({
    where: { barcode: decodeURIComponent(code) },
    include: { category: true },
  });

  if (!product) {
    return NextResponse.json({ product: null }, { status: 404 });
  }

  return NextResponse.json({ product });
}
