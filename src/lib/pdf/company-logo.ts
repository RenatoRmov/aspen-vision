import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

// Drop the real Aspen Vision logo at public/brand/logo.png (or .jpg) and it
// shows up on every printed PDF automatically — no other code change needed.
// It's a build-time static asset (unlike user-uploaded product photos), so
// it's simply part of the deployment output and safe to read from disk in
// both local dev and on Vercel.
const CANDIDATE_FILENAMES = ["logo.png", "logo.jpg", "logo.jpeg"];

let cached: string | null | undefined;

export async function getCompanyLogoSrc(): Promise<string | null> {
  if (cached !== undefined) return cached;

  for (const filename of CANDIDATE_FILENAMES) {
    try {
      const filePath = path.join(process.cwd(), "public", "brand", filename);
      const buffer = await readFile(filePath);
      const ext = path.extname(filename).toLowerCase();
      cached = `data:${MIME_BY_EXT[ext]};base64,${buffer.toString("base64")}`;
      return cached;
    } catch {
      // try the next candidate
    }
  }

  cached = null;
  return cached;
}
