import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

async function loadBrandLogo(
  candidateFilenames: string[],
  cache: Map<string, string | null>,
): Promise<string | null> {
  const key = candidateFilenames.join("|");
  if (cache.has(key)) return cache.get(key)!;

  for (const filename of candidateFilenames) {
    try {
      const filePath = path.join(process.cwd(), "public", "brand", filename);
      const buffer = await readFile(filePath);
      const ext = path.extname(filename).toLowerCase();
      const src = `data:${MIME_BY_EXT[ext]};base64,${buffer.toString("base64")}`;
      cache.set(key, src);
      return src;
    } catch {
      // try the next candidate
    }
  }

  cache.set(key, null);
  return null;
}

const logoCache = new Map<string, string | null>();

// Drop the real Aspen Vision logo at public/brand/logo.png (or .jpg) and it
// shows up on every printed sale/embajador/garantía PDF automatically — no
// other code change needed. It's a build-time static asset (unlike
// user-uploaded product photos), so it's simply part of the deployment
// output and safe to read from disk in both local dev and on Vercel.
export function getCompanyLogoSrc(): Promise<string | null> {
  return loadBrandLogo(["logo.png", "logo.jpg", "logo.jpeg"], logoCache);
}

// Same idea, but for the "Aspen Cobranza" wordmark used only on the
// Cobranzas client statement PDF — a distinct brand asset from the main
// Aspen Vision logo above.
export function getCobranzaLogoSrc(): Promise<string | null> {
  return loadBrandLogo(
    ["logo-cobranza.png", "logo-cobranza.jpg", "logo-cobranza.jpeg"],
    logoCache,
  );
}
