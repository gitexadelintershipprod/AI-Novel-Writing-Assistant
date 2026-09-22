import { hashImportBytes } from "./importHash.ts";

export const MAX_IMPORT_FILES = 1000;
export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_IMPORT_JSON_BYTES = 20 * 1024 * 1024;

export function normalizeImportText(source: string): string {
  return source.replace(/\r\n?/g, "\n").replace(/\u0000/g, "").trim();
}

export function validateImportFile(file: { name: string; size: number }): string | null {
  if (!file.name.toLowerCase().endsWith(".txt")) return "Only TXT files are supported.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_IMPORT_FILE_BYTES) return "This file exceeds the 10 MiB limit.";
  return null;
}

export function validateImportContent(content: string): string | null {
  if (!normalizeImportText(content)) return "This file contains no readable text.";
  if (new TextEncoder().encode(content).byteLength > MAX_IMPORT_FILE_BYTES) {
    return "Decoded text exceeds the 10 MiB limit. Split this file into smaller files.";
  }
  if (new TextEncoder().encode(JSON.stringify({ content })).byteLength > MAX_IMPORT_JSON_BYTES) {
    return "The upload request exceeds the 20 MiB limit. Split this file into smaller files.";
  }
  return null;
}

export function createImportFileId(): string {
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") globalThis.crypto.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function hashImportText(content: string): Promise<string> {
  const data = new TextEncoder().encode(normalizeImportText(content));
  const digest = globalThis.crypto?.subtle?.digest;
  return hashImportBytes(data, typeof digest === "function" ? digest.bind(globalThis.crypto.subtle) : null);
}

export async function importFileKey(relativePath: string, contentHash: string): Promise<string> {
  return hashImportText(`${relativePath}\u0000${contentHash}`);
}

export function formatImportBytes(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MiB` : `${Math.ceil(bytes / 1024)} KiB`;
}

export function toggleSelection(current: Set<string>, id: string): Set<string> {
  const next = new Set(current);
  if (next.has(id)) next.delete(id); else next.add(id);
  return next;
}

export function indexProgressPercent(fraction: number): number {
  return Math.round(Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0)) * 100);
}

/** Runs one file at a time; pausing takes effect at the next file boundary. */
export async function runImportSequence<T>(items: T[], shouldPause: () => boolean, run: (item: T) => Promise<void>): Promise<T[]> {
  for (let index = 0; index < items.length; index += 1) {
    if (shouldPause()) return items.slice(index);
    await run(items[index]);
  }
  return [];
}
