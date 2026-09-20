/**
 * Image-generation runtime helpers (single source).
 *
 * Replaces identical copies that were scattered across 4 comic services and 2 drama services.
 */
import fs from "fs/promises";
import path from "path";

/** Safe JSON parse (returns fallback on failure). */
export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Save an image URL (data: or http(s):) to local disk. */
export async function saveImageToDisk(imageUrl: string, destPath: string): Promise<void> {
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  if (imageUrl.startsWith("data:")) {
    const [, b64 = ""] = imageUrl.split(",", 2);
    await fs.writeFile(destPath, Buffer.from(b64, "base64"));
  } else {
    const resp = await fetch(imageUrl);
    if (!resp.ok) throw new Error(`Image download failed (${resp.status}): ${imageUrl}`);
    await fs.writeFile(destPath, Buffer.from(await resp.arrayBuffer()));
  }
}

/** Infer extension from URL (png/jpg/webp); default png when unrecognized. */
export function inferExtension(imageUrl: string): string {
  if (imageUrl.startsWith("data:image/jpeg")) return "jpg";
  if (imageUrl.startsWith("data:image/webp")) return "webp";
  try {
    const ext = path.extname(new URL(imageUrl).pathname).replace(".", "").toLowerCase();
    return ext || "png";
  } catch {
    return "png";
  }
}

/** Normalize an error value to a string. */
export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
