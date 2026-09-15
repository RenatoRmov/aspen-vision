import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// On Vercel, `public/` is read-only at runtime — /tmp is the only writable
// path, served back out through src/app/uploads/[...path]/route.ts. Locally
// (and on any server with a persistent disk) we write straight into
// public/uploads so Next's static file server handles it directly.
// (Written as two static branches, rather than one path.join with a dynamic
// base, so Next's file tracer doesn't fall back to bundling the whole repo.)
function uploadDestination(filename: string): string {
  if (process.env.VERCEL) {
    return path.join("/tmp/uploads", filename);
  }
  return path.join(process.cwd(), "public", "uploads", filename);
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
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Formato no soportado. Usa JPG, PNG, WEBP o AVIF." },
      { status: 400 },
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "La imagen supera los 5MB permitidos." },
      { status: 400 },
    );
  }

  const ext = file.type.split("/")[1];
  const filename = `${randomUUID()}.${ext}`;
  const destination = uploadDestination(filename);

  await mkdir(path.dirname(destination), { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(destination, buffer);

  return NextResponse.json({ url: `/uploads/${filename}` });
}
