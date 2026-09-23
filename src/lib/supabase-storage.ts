import "server-only";
import { createClient } from "@supabase/supabase-js";

const PRODUCT_IMAGES_BUCKET = "product-images";

// Service-role client: bypasses RLS entirely, so every write here must stay
// behind our own auth/permission checks (see api/upload/route.ts) — never
// expose this client or the key it holds to the browser.
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

/** Uploads a product image to Supabase Storage and returns its public URL —
 * durable across deployments, unlike a serverless function's local disk. */
export async function uploadProductImage(
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(filename, buffer, { contentType, cacheControl: "31536000" });
  if (error) throw error;

  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}
