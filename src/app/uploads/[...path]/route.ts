import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

/**
 * Only reached on Vercel: `public/uploads` has nothing at runtime there, so
 * newly uploaded images live in /tmp instead (see src/app/api/upload) and
 * are served back out through this route. Locally, Next's static file
 * server handles /uploads/* directly and this route never runs.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const filename = segments.join("/");

  if (filename.includes("..")) {
    return NextResponse.json({ error: "Ruta no válida" }, { status: 400 });
  }

  try {
    const filePath = path.join("/tmp/uploads", filename);
    const buffer = await readFile(filePath);
    const ext = path.extname(filename).toLowerCase();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
}
