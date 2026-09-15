import type { Prisma } from "@/generated/prisma/client";

/**
 * `Product.images` is a Prisma `Json` column holding a plain string array.
 * Always write it as a real JS array (`{ images: ["url1", "url2"] }`) —
 * never `JSON.stringify` it first, or Prisma will store the array as a
 * quoted JSON *string* instead of a JSON array.
 */
export function parseImages(images: Prisma.JsonValue): string[] {
  if (Array.isArray(images)) {
    return images.filter((v): v is string => typeof v === "string");
  }
  return [];
}

export function primaryImage(images: Prisma.JsonValue): string | null {
  return parseImages(images)[0] ?? null;
}
