import "server-only";
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
 * @react-pdf/renderer needs either a remote URL it can fetch itself or a
 * data: URI — a relative `/uploads/..` path (served from our own public
 * folder) resolves to neither at render time, so we read it off disk and
 * inline it as base64.
 */
export async function resolveImageSrc(url: string): Promise<string | null> {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;

  if (url.startsWith("/uploads/")) {
    try {
      // Mirrors the write path in src/app/api/upload/route.ts: on Vercel,
      // uploads live in /tmp (public/ is read-only there); everywhere else
      // they're written straight into public/uploads.
      const filePath = process.env.VERCEL
        ? path.join("/tmp/uploads", url.slice("/uploads/".length))
        : path.join(process.cwd(), "public", url);
      const buffer = await readFile(filePath);
      const ext = path.extname(url).toLowerCase();
      const mime = MIME_BY_EXT[ext] ?? "image/jpeg";
      return `data:${mime};base64,${buffer.toString("base64")}`;
    } catch {
      return null;
    }
  }

  return null;
}
