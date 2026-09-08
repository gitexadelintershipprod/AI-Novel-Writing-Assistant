import type { ApiResponse } from "@ai-novel/shared/types/api";
import type { RagJobProgress } from "./knowledge";
import { apiClient } from "./client";

export interface ImportBatch { id: string; name: string; processingPaused: boolean; createdAt: string }
export interface ImportItem {
  id: string; batchId: string; key: string; fileName: string; relativePath: string; byteSize: number;
  contentHash: string; uploadStatus: "pending" | "stored" | "duplicate" | "failed";
  error: string | null; documentId: string | null; documentVersionId: string | null; jobId: string | null;
  indexStatus: string; progress: RagJobProgress | null; documentTitle?: string; documentStatus?: string; createdAt: string;
}
export interface ImportFileMetadata { key: string; fileName: string; relativePath: string; byteSize: number; contentHash: string }
export interface ImportDetail {
  batch: ImportBatch; items: ImportItem[]; total: number; page: number; pageSize: number;
  counts: Record<"stored" | "duplicate" | "pending" | "failed" | "queued" | "running" | "succeeded", number>;
  eligibleIds: string[];
}
export interface ImportActionResult { itemId: string; status: string; error?: string }

function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success || response.data === undefined) throw new Error(response.error ?? response.message ?? "The import request failed.");
  return response.data;
}
const path = (id: string) => `/knowledge/imports/${encodeURIComponent(id)}`;
export async function createImportBatch(name: string) {
  return unwrap((await apiClient.post<ApiResponse<ImportBatch>>("/knowledge/imports", { name })).data);
}
export async function listImportBatches(page = 1) {
  return unwrap((await apiClient.get<ApiResponse<{ items: ImportBatch[]; total: number; page: number; pageSize: number }>>("/knowledge/imports", { params: { page, pageSize: 50 } })).data);
}
export async function getImportBatch(id: string, page = 1) {
  return unwrap((await apiClient.get<ApiResponse<ImportDetail>>(path(id), { params: { page, pageSize: 50 } })).data);
}
export async function prepareImportFiles(id: string, files: ImportFileMetadata[]) {
  return unwrap((await apiClient.post<ApiResponse<ImportItem[]>>(`${path(id)}/prepare`, { files })).data);
}
export async function uploadImportFile(batchId: string, itemId: string, content: string, onProgress: (percent: number) => void) {
  return unwrap((await apiClient.post<ApiResponse<ImportItem>>(`${path(batchId)}/items/${encodeURIComponent(itemId)}/upload`, { content }, {
    onUploadProgress: (event) => onProgress(Math.round((event.progress ?? 0) * 100)),
  })).data);
}
export async function queueImportItems(id: string, itemIds: string[]) {
  return unwrap((await apiClient.post<ApiResponse<ImportActionResult[]>>(`${path(id)}/queue`, { itemIds })).data);
}
export async function pauseImportBatch(id: string, paused: boolean) {
  return unwrap((await apiClient.post<ApiResponse<ImportBatch>>(`${path(id)}/pause`, { paused })).data);
}
export async function retryImportItems(id: string) {
  return unwrap((await apiClient.post<ApiResponse<ImportActionResult[]>>(`${path(id)}/retry`, {})).data);
}
