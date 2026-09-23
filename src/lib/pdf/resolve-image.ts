import "server-only";

/**
 * @react-pdf/renderer needs either a remote URL it can fetch itself or a
 * data: URI. Every product image now lives in Supabase Storage as a public
 * https:// URL, so this just passes it through — kept as its own function
 * since the PDF route treats "no image" (empty string) as a case to handle
 * explicitly rather than inlining the check.
 */
export async function resolveImageSrc(url: string): Promise<string | null> {
  return url || null;
}
