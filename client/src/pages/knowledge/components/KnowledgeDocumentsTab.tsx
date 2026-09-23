import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { CircleAlert, FileText, LoaderCircle, MoreHorizontal, RefreshCw, Upload, X } from "lucide-react";
import type { KnowledgeDocumentStatus, KnowledgeDocumentSummary } from "@ai-novel/shared/types/knowledge";
import {
  AssetLibraryEmptyState,
} from "@/components/assetLibrary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import OpenInCreativeHubButton from "@/components/creativeHub/OpenInCreativeHubButton";
import SelectField from "@/components/common/SelectField";
import { AppDialogContent, Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { RagJobSummary } from "@/api/knowledge";
import {
  formatRagJobMeta,
  formatRelationshipStatus,
  formatStatus,
  getRagJobProgressPercent,
  getRagJobProgressWidth,
} from "./knowledgeRagUi";

function formatDocumentKind(kind: KnowledgeDocumentSummary["kind"]): string {
  return kind === "analysis_published" ? "Open book release" : "Upload documents";
}

interface KnowledgeDocumentsTabProps {
  uploadTitle: string;
  onUploadTitleChange: (value: string) => void;
  uploadDialogOpen: boolean;
  onUploadDialogOpenChange: (open: boolean) => void;
  uploadBusy: boolean;
  onUploadFile: (file: File) => Promise<void>;
  keyword: string;
  onKeywordChange: (value: string) => void;
  status: KnowledgeDocumentStatus | "";
  onStatusChange: (value: KnowledgeDocumentStatus | "") => void;
  documents: KnowledgeDocumentSummary[];
  isLoading: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onClearFilters: () => void;
  latestKnowledgeDocumentJobs: Map<string, RagJobSummary>;
  onSelectDocument: (id: string) => void;
  onOpenRecallTest: (id: string) => void;
  onReindexDocument: (id: string) => void;
  onUpdateStatus: (id: string, status: KnowledgeDocumentStatus) => void;
}

export default function KnowledgeDocumentsTab({
  uploadTitle,
  onUploadTitleChange,
  uploadDialogOpen,
  onUploadDialogOpenChange,
  uploadBusy,
  onUploadFile,
  keyword,
  onKeywordChange,
  status,
  onStatusChange,
  documents,
  isLoading,
  errorMessage,
  onRetry,
  onClearFilters,
  latestKnowledgeDocumentJobs,
  onSelectDocument,
  onOpenRecallTest,
  onReindexDocument,
  onUpdateStatus,
}: KnowledgeDocumentsTabProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === "text/plain" || file.name.endsWith(".txt"))) {
      setSelectedFile(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setSelectedFile(file);
  }, []);

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;
    await handleUploadFile(selectedFile);
    setSelectedFile(null);
  };

  const handleDialogOpenChange = (open: boolean) => {
    onUploadDialogOpenChange(open);
    if (!open) setSelectedFile(null);
  };
  const statusOptions = [
    { value: "", label: "All unarchived" },
    { value: "enabled", label: "Enable only" },
    { value: "disabled", label: "Deactivate only" },
    { value: "archived", label: "Archive only" },
  ] as const;

  const confirmArchiveDocument = (document: KnowledgeDocumentSummary) => {
    const confirmed = window.confirm(
      `Archive "${document.title}"? Archiving removes it from default retrieval and material selection; the original text and versions are kept, and you can re-enable it from "Archived only".`,
    );
    if (!confirmed) {
      return;
    }
    onUpdateStatus(document.id, "archived");
  };

  const handleUploadFile = async (file: File) => {
    await onUploadFile(file);
    onUploadDialogOpenChange(false);
  };

  const renderDocumentRow = (document: KnowledgeDocumentSummary) => {
    const documentJob = latestKnowledgeDocumentJobs.get(document.id);
    const activeJob = documentJob && (documentJob.status === "queued" || documentJob.status === "running")
      ? documentJob
      : undefined;
    const displayIndexStatus = activeJob && activeJob.jobType !== "graph_sync"
      ? activeJob.status
      : document.status === "archived"
        ? "idle"
      : document.latestIndexStatus;
    const displayGraphStatus = document.status === "archived"
      ? "idle"
      : activeJob?.jobType === "graph_sync"
        ? activeJob.status
        : (document.latestGraphStatus ?? "idle");

    return (
      <article
        key={document.id}
        className="flex min-h-64 flex-col rounded-2xl border border-border/35 bg-card/70 p-5 transition-all hover:border-border/65 hover:shadow-[0_12px_32px_rgba(15,23,42,0.035)]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/[0.07] text-primary">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="truncate text-base font-semibold tracking-tight">{document.title}</div>
              <div className="truncate text-xs text-muted-foreground">{document.fileName}</div>
              <div className="text-xs text-muted-foreground">
                current v{document.activeVersionNumber} · {document.versionCount} versions · {formatDocumentKind(document.kind)}
              </div>
              {document.bookAnalysisCount > 0 ? (
                <div className="text-xs text-muted-foreground">Linked to {document.bookAnalysisCount} open-book projects</div>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="border-0 bg-muted/60 font-normal">{formatStatus(document.status)}</Badge>
            <Badge
              variant="secondary"
              className={`border-0 font-normal ${displayIndexStatus === "succeeded" ? "bg-success/10 text-success" : displayIndexStatus === "failed" ? "bg-destructive/10 text-destructive" : "bg-muted/60"}`}
            >
              {`Index: ${formatStatus(displayIndexStatus)}`}
            </Badge>
            <Badge
              variant="secondary"
              className={`border-0 font-normal ${displayGraphStatus === "succeeded" ? "bg-success/10 text-success" : displayGraphStatus === "failed" ? "bg-destructive/10 text-destructive" : "bg-muted/60"}`}
            >
              {formatRelationshipStatus(displayGraphStatus)}
            </Badge>
          </div>
        </div>
        <div className="mt-4 flex-1">
            {activeJob?.progress ? (
              <div className="rounded-xl bg-info/5 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-medium">{activeJob.progress.label}</span>
                  <span>{getRagJobProgressPercent(activeJob)}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: getRagJobProgressWidth(activeJob) }}
                  />
                </div>
                {activeJob.progress.detail ? (
                  <div className="mt-2 text-xs text-muted-foreground">{activeJob.progress.detail}</div>
                ) : null}
                <div className="mt-1 text-xs text-muted-foreground">{formatRagJobMeta(activeJob)}</div>
              </div>
            ) : null}
            {document.latestIndexStatus === "failed" && document.latestIndexError ? (
              <div className="rounded-xl bg-destructive/[0.055] px-3 py-2 text-xs leading-5 text-destructive">{document.latestIndexError}</div>
            ) : null}
        </div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-border/30 pt-4">
          <Button size="sm" variant="secondary" className="rounded-full" onClick={() => onSelectDocument(document.id)}>
            View profile
          </Button>
          {document.status === "archived" ? (
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => onUpdateStatus(document.id, "enabled")}
            >
              Restore enabled
            </Button>
          ) : (
            <>
              <OpenInCreativeHubButton
                bindings={{ knowledgeDocumentIds: [document.id] }}
                label="Keep creating"
                variant="outline"
                className="rounded-full"
              />
            </>
          )}
        </div>
        {document.status !== "archived" ? (
          <details className="group mt-3">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs text-muted-foreground marker:hidden">
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              More actions
            </summary>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="ghost" className="rounded-full">
                <Link to={`/book-analysis?documentId=${document.id}`}>Create a new book</Link>
              </Button>
              {document.kind === "analysis_published" && document.sourceAnalysisId ? (
                <Button asChild size="sm" variant="ghost" className="rounded-full">
                  <Link to={`/book-analysis?analysisId=${document.sourceAnalysisId}`}>View source split book</Link>
                </Button>
              ) : null}
              {document.latestIndexStatus === "succeeded" ? (
                <Button size="sm" variant="ghost" className="rounded-full" onClick={() => onOpenRecallTest(document.id)}>
                  recall test
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => onReindexDocument(document.id)}>
                Rebuild index
              </Button>
              {document.status === "enabled" ? (
                <Button size="sm" variant="ghost" className="rounded-full" onClick={() => onUpdateStatus(document.id, "disabled")}>deactivate</Button>
              ) : document.status === "disabled" ? (
                <Button size="sm" variant="ghost" className="rounded-full" onClick={() => onUpdateStatus(document.id, "enabled")}>enable</Button>
              ) : null}
              <Button size="sm" variant="ghost" className="rounded-full text-muted-foreground hover:text-destructive" onClick={() => confirmArchiveDocument(document)}>
                Archive
              </Button>
            </div>
          </details>
        ) : null}
      </article>
    );
  };

  const hasFilters = Boolean(keyword.trim() || status);

  const renderDocuments = () => {
    if (isLoading) {
      return (
        <div className="flex min-h-40 items-center justify-center rounded-md border border-dashed border-border px-5 py-8 text-center" role="status">
          <div>
            <LoaderCircle className="mx-auto h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-foreground">Loading creative data</p>
            <p className="mt-1 text-sm text-muted-foreground">Confirming data version and index status.</p>
          </div>
        </div>
      );
    }

    if (errorMessage) {
      return (
        <AssetLibraryEmptyState
          icon={CircleAlert}
          title="The creative data cannot be loaded temporarily."
          description={`${errorMessage} Reloading will not modify existing data.`}
          action={(
            <Button type="button" size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="h-4 w-4" />
              reload
            </Button>
          )}
        />
      );
    }

    if (documents.length === 0) {
      return (
        <AssetLibraryEmptyState
          icon={FileText}
          title={hasFilters ? "No matching data" : "No creative information yet"}
          description={hasFilters
            ? "Adjust search terms or status filters to return additional information."
            : "After uploading TXT data, the system will create a search index that can be used for book opening, planning, and text creation."}
          action={hasFilters ? (
            <Button type="button" size="sm" variant="outline" onClick={onClearFilters}>
              Clear filters
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={() => onUploadDialogOpenChange(true)}>
              <Upload className="h-4 w-4" />
              Upload the first information
            </Button>
          )}
        />
      );
    }

    return <div className="grid gap-4 xl:grid-cols-2">{documents.map(renderDocumentRow)}</div>;
  };

  return (
    <>
      <section className="scroll-mt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Information bookshelf</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Select searchable data to continue creating, and version and index maintenance are handled as needed.</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => onUploadDialogOpenChange(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload information
          </Button>
        </div>
        <div id="knowledge-documents" className="mt-5 space-y-4 scroll-mt-5">
          <div className="grid gap-2 rounded-2xl bg-muted/20 p-3 md:grid-cols-[1fr_180px]">
            <Input
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder="Search by title or file name"
            />
            <SelectField
              value={status}
              onValueChange={(value) => onStatusChange(value as KnowledgeDocumentStatus | "")}
              options={statusOptions.map((option) => ({ ...option }))}
              placeholder="filter status"
              className="space-y-0"
              triggerClassName="h-10"
            />
          </div>
          {renderDocuments()}
        </div>
      </section>

      <Dialog open={uploadDialogOpen} onOpenChange={handleDialogOpenChange}>
        <AppDialogContent
          className="max-w-lg"
          title="Upload documents"
          description="Add text material that can be used for searching, unpacking, and creating references."
        >
          <div className="space-y-4">
            <Input
              value={uploadTitle}
              onChange={(event) => onUploadTitleChange(event.target.value)}
              placeholder="Optional title, leave blank to use filename"
            />

            {/* Drag-and-drop upload area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !selectedFile && fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (!selectedFile && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              role={selectedFile ? undefined : "button"}
              tabIndex={selectedFile ? undefined : 0}
              aria-label={selectedFile ? undefined : "Select the TXT text data to upload"}
              className={[
                "relative flex flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed p-8 text-center transition-all",
                dragOver
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : selectedFile
                    ? "border-primary/40 bg-primary/5"
                    : "border-muted-foreground/25 bg-muted/30 hover:border-primary/40 hover:bg-muted/50 cursor-pointer",
              ].join(" ")}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={handleFileSelect}
                disabled={uploadBusy}
              />

              {selectedFile ? (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                    className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    aria-label="Remove selected files"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className={[
                    "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                    dragOver ? "bg-primary/15" : "bg-muted",
                  ].join(" ")}>
                    <Upload className={["h-6 w-6 transition-colors", dragOver ? "text-primary" : "text-muted-foreground"].join(" ")} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {dragOver ? "Release the mouse to upload" : "Drag and drop files here, or click to select"}
                    </p>
                    <p className="text-xs text-muted-foreground">Only .txt text files are supported</p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground leading-5">
                The title with the same name will be appended as a new version and set as the current version
              </p>
              <Button
                type="button"
                size="sm"
                disabled={!selectedFile || uploadBusy}
                onClick={() => void handleConfirmUpload()}
              >
                {uploadBusy ? "Uploading…" : "Confirm upload"}
              </Button>
            </div>
          </div>
        </AppDialogContent>
      </Dialog>
    </>
  );
}
