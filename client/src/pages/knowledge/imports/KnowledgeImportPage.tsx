import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { readTextFile } from "@/lib/textFile";
import { translateUiText } from "@/i18n/legacyUi";
import {
  createImportBatch, getImportBatch, listImportBatches, pauseImportBatch,
  prepareImportFiles, queueImportItems, retryImportItems, uploadImportFile,
  type ImportFileMetadata, type ImportItem,
} from "@/api/knowledgeImport";
import {
  createImportFileId, formatImportBytes, hashImportText, importFileKey, indexProgressPercent, MAX_IMPORT_FILES,
  runImportSequence, toggleSelection, validateImportContent, validateImportFile,
} from "./importFiles";

interface LocalFile {
  id: string; file: File; path: string; metadata?: ImportFileMetadata; item?: ImportItem;
  error?: string; status: "checking" | "ready" | "invalid" | "uploading" | "stored" | "duplicate" | "failed";
  percent: number;
}

function errorText(error: unknown): string {
  return translateUiText(error instanceof Error ? error.message : "The request failed. Please try again.");
}
const cell = "px-3 py-3 text-left align-top";

export default function KnowledgeImportPage() {
  const [params, setParams] = useSearchParams();
  const batchId = params.get("batch") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [historyPage, setHistoryPage] = useState(1);
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState(new Set<string>());
  const [selectedItems, setSelectedItems] = useState(new Set<string>());
  const [busy, setBusy] = useState<"checking" | "uploading" | "action" | null>(null);
  const [message, setMessage] = useState("");
  const [uploadPaused, setUploadPaused] = useState(false);
  const pauseUploads = useRef(false);
  const remainingUploads = useRef<LocalFile[]>([]);
  const mounted = useRef(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const history = useQuery({ queryKey: ["knowledge-imports", historyPage], queryFn: () => listImportBatches(historyPage) });
  const detail = useQuery({
    queryKey: ["knowledge-import", batchId, page], queryFn: () => getImportBatch(batchId, page),
    enabled: Boolean(batchId), refetchInterval: 2500,
  });
  const data = detail.data;
  const eligible = new Set(data?.eligibleIds ?? []);
  const queueIds = [...selectedItems].filter((id) => eligible.has(id));
  const readyFiles = files.filter((file) => file.status === "ready" || file.status === "failed");
  const selectedUploads = readyFiles.filter((file) => selectedFiles.has(file.id));
  const supportsFolder = typeof document !== "undefined" && "webkitdirectory" in document.createElement("input");

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; pauseUploads.current = true; };
  }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (busy === "uploading" || busy === "checking") { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["knowledge-import", batchId] }),
      queryClient.invalidateQueries({ queryKey: ["knowledge-imports"] }),
      queryClient.invalidateQueries({ queryKey: ["knowledge", "documents"] }),
    ]);
  }
  function updateFile(id: string, patch: Partial<LocalFile>) {
    if (mounted.current) setFiles((previous) => previous.map((file) => file.id === id ? { ...file, ...patch } : file));
  }
  function openBatch(id: string) {
    setFiles([]); setSelectedFiles(new Set()); setSelectedItems(new Set()); setMessage("");
    remainingUploads.current = []; setUploadPaused(false); setParams(id ? { batch: id } : {});
  }
  async function chooseFiles(chosen: File[]) {
    if (!chosen.length || busy) return;
    if (files.length + chosen.length > MAX_IMPORT_FILES) { setMessage("Choose no more than 1,000 files per import."); return; }
    setBusy("checking"); setMessage("");
    let activeBatchId = batchId;
    const candidates: LocalFile[] = chosen.map((file) => ({
      id: createImportFileId(), file, path: file.webkitRelativePath || file.name, status: "checking", percent: 0,
    }));
    setFiles((previous) => [...previous, ...candidates]);
    const hashes = new Set(files.filter((file) => file.metadata && file.status !== "invalid").map((file) => file.metadata!.contentHash));
    try {
      if (!activeBatchId) {
        const batch = await createImportBatch(`Import ${new Date().toLocaleString("en-US")}`);
        activeBatchId = batch.id;
        if (mounted.current) setParams({ batch: batch.id });
      }
      await runImportSequence(candidates, () => !mounted.current, async (candidate) => {
        try {
          const validation = validateImportFile(candidate.file);
          if (validation) { updateFile(candidate.id, { status: "invalid", error: validation }); return; }
          const content = await readTextFile(candidate.file);
          const contentError = validateImportContent(content);
          if (contentError) { updateFile(candidate.id, { status: "invalid", error: contentError }); return; }
          const contentHash = await hashImportText(content);
          if (hashes.has(contentHash)) { updateFile(candidate.id, { status: "duplicate", error: "Identical content is already in this selection." }); return; }
          const metadata = {
            key: await importFileKey(candidate.path, contentHash), fileName: candidate.file.name,
            relativePath: candidate.path, byteSize: candidate.file.size, contentHash,
          };
          const [item] = await prepareImportFiles(activeBatchId, [metadata]);
          if (!item) throw new Error("The file could not be checked. Select it again to retry.");
          hashes.add(contentHash);
          const status = item.uploadStatus === "stored" || item.uploadStatus === "duplicate" ? item.uploadStatus : "ready";
          updateFile(candidate.id, { metadata, item, status, error: item.error ?? undefined });
          if (status === "ready") setSelectedFiles((previous) => new Set([...previous, candidate.id]));
        } catch (error) { updateFile(candidate.id, { status: "invalid", error: errorText(error) }); }
      });
      await queryClient.invalidateQueries({ queryKey: ["knowledge-import", activeBatchId] });
      await queryClient.invalidateQueries({ queryKey: ["knowledge-imports"] });
    } catch (error) {
      setMessage(errorText(error));
      for (const file of candidates) updateFile(file.id, { status: "invalid", error: "File checking did not finish. Remove this row and select the file again." });
    } finally { if (mounted.current) setBusy(null); }
  }
  async function uploadSelection(failedOnly = false) {
    if (busy || !batchId) return;
    const pending = failedOnly ? files.filter((file) => file.status === "failed") : uploadPaused ? remainingUploads.current : selectedUploads;
    const previouslyPaused = failedOnly ? remainingUploads.current : [];
    pauseUploads.current = false; setUploadPaused(false); setBusy("uploading"); setMessage("");
    try {
      const remaining = await runImportSequence(pending, () => pauseUploads.current || !mounted.current, async (file) => {
        if (!file.item) return;
        updateFile(file.id, { status: "uploading", percent: 0, error: undefined });
        try {
          const content = await readTextFile(file.file);
          const validation = validateImportContent(content);
          if (validation) throw new Error(validation);
          if (await hashImportText(content) !== file.metadata?.contentHash) throw new Error("The file changed after checking. Remove it and select it again.");
          const item = await uploadImportFile(batchId, file.item.id, content, (percent) => updateFile(file.id, { percent }));
          updateFile(file.id, { item, status: item.uploadStatus === "duplicate" ? "duplicate" : item.uploadStatus === "stored" ? "stored" : "failed", percent: 100, error: item.error ?? undefined });
          await refresh();
        } catch (error) { updateFile(file.id, { status: "failed", error: errorText(error) }); }
      });
      remainingUploads.current = [...remaining, ...previouslyPaused.filter((file) => !pending.some((retry) => retry.id === file.id))];
      if (mounted.current) { setUploadPaused(remainingUploads.current.length > 0); setMessage(remainingUploads.current.length ? "Uploads paused. Resume to continue the selected files." : "Upload pass finished. Select saved files below to add them to the processing queue."); }
    } finally { if (mounted.current) setBusy(null); }
  }
  async function action(run: () => Promise<unknown>) {
    if (busy) return;
    setBusy("action"); setMessage("");
    try {
      const result = await run();
      if (Array.isArray(result)) {
        const errors = result.filter((item) => item.error).map((item) => `${item.itemId}: ${translateUiText(item.error)}`);
        setMessage(errors.length ? errors.join("; ") : "Processing queue updated.");
      }
      await refresh();
    } catch (error) { setMessage(errorText(error)); } finally { setBusy(null); }
  }

  return <div className="space-y-8">
    <header className="space-y-2">
      <Link to="/knowledge" className="text-sm text-primary">Back to Knowledge Base</Link>
      <h1 className="text-3xl font-semibold">Bulk Import</h1>
      <p className="text-muted-foreground">Save TXT files first, then select which files to process. Saving does not start indexing or use the embedding model.</p>
    </header>
    <section className="flex flex-wrap items-center gap-3">
      <label htmlFor="import-history">Import history</label>
      <select id="import-history" className="max-w-full rounded-md border bg-background p-2" disabled={Boolean(busy)} value={batchId} onChange={(event) => openBatch(event.target.value)}>
        <option value="">New import</option>
        {batchId && !history.data?.items.some((batch) => batch.id === batchId) && <option value={batchId}>{data?.batch.name ?? "Selected import"}</option>}
        {history.data?.items.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}
      </select>
      <Button variant="outline" disabled={Boolean(busy)} onClick={() => openBatch("")}>New import</Button>
      <Button variant="ghost" disabled={Boolean(busy) || historyPage <= 1} onClick={() => setHistoryPage((previous) => previous - 1)}>Newer imports</Button>
      <Button variant="ghost" disabled={Boolean(busy) || !history.data || historyPage * history.data.pageSize >= history.data.total} onClick={() => setHistoryPage((previous) => previous + 1)}>Older imports</Button>
    </section>
    {(message || history.error || detail.error) && <p role="status" className="rounded-md bg-muted/50 p-4 text-sm whitespace-pre-wrap">{message || errorText(history.error ?? detail.error)}</p>}
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">1. Choose and save files</h2>
      <p className="text-sm text-muted-foreground">Up to 1,000 TXT files per import, 10 MiB each. Folder selection includes subfolders. Identical content is skipped; different files with matching titles are saved separately.</p>
      <div className="flex flex-wrap gap-2">
        <input ref={fileInput} className="hidden" type="file" accept=".txt,text/plain" multiple onChange={(event) => { void chooseFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
        <input ref={folderInput} className="hidden" type="file" multiple {...{ webkitdirectory: "" }} onChange={(event) => { void chooseFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
        <Button variant="outline" disabled={Boolean(busy)} onClick={() => fileInput.current?.click()}>Choose files</Button>
        {supportsFolder && <Button variant="outline" disabled={Boolean(busy)} onClick={() => folderInput.current?.click()}>Choose folder</Button>}
        <Button variant="ghost" disabled={Boolean(busy)} onClick={() => setSelectedFiles(new Set(readyFiles.map((file) => file.id)))}>Select all ready files</Button>
        <Button variant="ghost" disabled={Boolean(busy)} onClick={() => setSelectedFiles(new Set())}>Clear file selection</Button>
        <Button disabled={Boolean(busy) || !(uploadPaused ? remainingUploads.current.length : selectedUploads.length)} onClick={() => void uploadSelection()}>{uploadPaused ? "Resume uploads" : "Import selected"} ({uploadPaused ? remainingUploads.current.length : selectedUploads.length})</Button>
        {busy === "uploading" && <Button variant="outline" disabled={uploadPaused} onClick={() => { pauseUploads.current = true; setUploadPaused(true); }}>Pause uploads</Button>}
        <Button variant="outline" disabled={Boolean(busy) || !files.some((file) => file.status === "failed")} onClick={() => void uploadSelection(true)}>Retry failed uploads</Button>
      </div>
      <p className="text-sm text-muted-foreground">Selection applies to all files in the preview. Removing a row does not delete the file from your computer or a saved document.</p>
      {busy === "checking" && <p role="status">Checking files one at a time…</p>}
      {files.length > 0 && <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/40"><tr><th className={cell}>Select</th><th className={cell}>File / relative path</th><th className={cell}>Size</th><th className={cell}>Upload</th><th className={cell}>Action</th></tr></thead><tbody>
        {files.map((file) => <tr key={file.id} className="border-b border-border/40">
          <td className={cell}><input type="checkbox" aria-label={`Select ${file.path} for upload`} checked={selectedFiles.has(file.id)} disabled={Boolean(busy) || !["ready", "failed"].includes(file.status)} onChange={() => setSelectedFiles((previous) => toggleSelection(previous, file.id))} /></td>
          <td className={`${cell} break-all`}><span translate="no" data-preserve-language>{file.file.name}</span><div className="text-muted-foreground" translate="no" data-preserve-language>{file.path}</div></td>
          <td className={cell}>{formatImportBytes(file.file.size)}</td>
          <td className={cell}><span className="capitalize">{file.status}</span>{file.status === "uploading" && <><progress aria-label={`Upload progress for ${file.path}`} max={100} value={file.percent} className="block" />{file.percent}% transferred; waiting for storage confirmation</>}{file.error && <p className="text-destructive">{translateUiText(file.error)}</p>}</td>
          <td className={cell}><Button variant="ghost" size="sm" disabled={Boolean(busy)} onClick={() => { remainingUploads.current = remainingUploads.current.filter((entry) => entry.id !== file.id); setFiles((previous) => previous.filter((entry) => entry.id !== file.id)); setSelectedFiles((previous) => { const next = new Set(previous); next.delete(file.id); return next; }); if (!remainingUploads.current.length) setUploadPaused(false); }}>Remove</Button></td>
        </tr>)}
      </tbody></table></div>}
      <p className="text-sm text-muted-foreground">After closing or refreshing this page, open the import from history and select the remaining local files again. Saved files and the processing queue are retained.</p>
    </section>
    {batchId && <section className="space-y-4">
      <h2 className="text-xl font-semibold">2. Select saved files to process</h2>
      <p className="text-sm text-muted-foreground">Nothing is selected automatically. Processing creates the searchable index and may incur embedding usage charges. Closing the browser does not pause processing.</p>
      {data && <p className="text-sm">Saved: {data.counts.stored} · Duplicates: {data.counts.duplicate} · Pending upload: {data.counts.pending} · Queued: {data.counts.queued} · Running: {data.counts.running} · Completed: {data.counts.succeeded}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={Boolean(busy) || !data?.eligibleIds.length} onClick={() => setSelectedItems(new Set(data?.eligibleIds))}>Select all eligible (all pages)</Button>
        <Button variant="ghost" disabled={Boolean(busy)} onClick={() => setSelectedItems(new Set())}>Clear selection</Button>
        <Button disabled={Boolean(busy) || !queueIds.length} onClick={() => void action(async () => { const result = await queueImportItems(batchId, queueIds); setSelectedItems(new Set()); return result; })}>Add selected to queue ({queueIds.length})</Button>
        <Button variant="outline" disabled={Boolean(busy) || !data} onClick={() => void action(() => pauseImportBatch(batchId, !data?.batch.processingPaused))}>{data?.batch.processingPaused ? "Resume processing" : "Pause processing"}</Button>
        <Button variant="outline" disabled={Boolean(busy) || !data} onClick={() => void action(() => retryImportItems(batchId))}>Retry failed processing</Button>
      </div>
      <p role="status" className="text-sm">{data?.batch.processingPaused ? "Processing paused. Any file already running will finish; no next file will start in this import." : "Processing enabled. Only files explicitly added to the queue will be indexed."}</p>
      {detail.isLoading ? <p>Loading import files…</p> : data && <>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/40"><tr><th className={cell}>Select</th><th className={cell}>Saved file</th><th className={cell}>Upload</th><th className={cell}>Indexing</th></tr></thead><tbody>
          {data.items.map((item) => <tr key={item.id} className="border-b border-border/40">
            <td className={cell}><input type="checkbox" aria-label={`Select ${item.fileName} for processing`} disabled={Boolean(busy) || !eligible.has(item.id)} checked={eligible.has(item.id) && selectedItems.has(item.id)} onChange={() => setSelectedItems((previous) => toggleSelection(previous, item.id))} /></td>
            <td className={`${cell} break-all`}><span translate="no" data-preserve-language>{item.documentTitle ?? item.fileName}</span><div className="text-muted-foreground" translate="no" data-preserve-language>{item.relativePath}</div><span>{formatImportBytes(item.byteSize)}</span></td>
            <td className={cell}><span className="capitalize">{item.uploadStatus}</span>{item.uploadStatus === "pending" && <p className="text-muted-foreground">Select this local file again to upload it.</p>}{item.error && <p className="text-destructive">{translateUiText(item.error)}</p>}</td>
            <td className={cell}><span className="capitalize">{item.indexStatus === "idle" || item.indexStatus === "not_indexed" ? "Not indexed" : item.indexStatus.replaceAll("_", " ")}</span>{item.progress && <><p>{translateUiText(item.progress.label)}</p><progress aria-label={`Indexing progress for ${item.fileName}`} max={100} value={indexProgressPercent(item.progress.percent)} /><span> {indexProgressPercent(item.progress.percent)}%</span>{item.progress.detail && <p>{translateUiText(item.progress.detail)}</p>}</>}</td>
          </tr>)}
        </tbody></table>{!data.items.length && <p className="py-6 text-muted-foreground">Choose files above to begin.</p>}</div>
        <div className="flex items-center gap-3"><Button variant="ghost" disabled={Boolean(busy) || page <= 1} onClick={() => setParams({ batch: batchId, page: String(page - 1) })}>Previous page</Button><span>Page {page} of {Math.max(1, Math.ceil(data.total / data.pageSize))} · {data.total} files</span><Button variant="ghost" disabled={Boolean(busy) || page * data.pageSize >= data.total} onClick={() => setParams({ batch: batchId, page: String(page + 1) })}>Next page</Button></div>
      </>}
    </section>}
  </div>;
}
