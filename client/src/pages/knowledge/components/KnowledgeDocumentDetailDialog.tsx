import { useState } from "react";
import type { KnowledgeDocumentDetail, KnowledgeRecallTestResult } from "@ai-novel/shared/types/knowledge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppDialogContent, Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatStatus } from "./knowledgeRagUi";

const PREVIEW_CHAR_LIMIT = 3000;
const EXPAND_WARN_THRESHOLD = 100_000;

function VersionContentPreview({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const truncated = content.length > PREVIEW_CHAR_LIMIT && !expanded;
  const displayText = truncated ? content.slice(0, PREVIEW_CHAR_LIMIT) : content;
  const isLarge = content.length > EXPAND_WARN_THRESHOLD;

  const handleExpand = () => {
    if (!expanded && isLarge) {
      if (!window.confirm(`This document contains ${content.length.toLocaleString("en-US")} characters. Showing the full text may slow down this page. Continue?`)) {
        return;
      }
    }
    setExpanded((v) => !v);
  };

  return (
    <div className="mt-3">
      <pre className="max-h-64 w-full max-w-full overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-all rounded-md bg-muted/40 p-3 text-xs">
        {displayText}
        {truncated ? "…" : null}
      </pre>
      {content.length > PREVIEW_CHAR_LIMIT ? (
        <button
          type="button"
          className="mt-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
          onClick={handleExpand}
        >
          {expanded
            ? `Collapse full text (${content.length.toLocaleString("en-US")} characters total)`
            : `Showing the first ${PREVIEW_CHAR_LIMIT.toLocaleString("en-US")} characters. Show full text (${content.length.toLocaleString("en-US")} characters total)`}
        </button>
      ) : null}
    </div>
  );
}

interface KnowledgeDocumentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document?: KnowledgeDocumentDetail;
  selectedDocumentId: string;
  versionBusy: boolean;
  onUploadVersionFile: (file: File) => Promise<void>;
  onReindex: () => void;
  recallQuery: string;
  onRecallQueryChange: (value: string) => void;
  onRecallTest: () => void;
  recallPending: boolean;
  recallErrorMessage?: string | null;
  recallResult: KnowledgeRecallTestResult | null;
  onRestoreDocument: () => void;
  restorePending: boolean;
  onActivateVersion: (versionId: string) => void;
  activateVersionPending: boolean;
}

export default function KnowledgeDocumentDetailDialog({
  open,
  onOpenChange,
  document,
  selectedDocumentId,
  versionBusy,
  onUploadVersionFile,
  onReindex,
  recallQuery,
  onRecallQueryChange,
  onRecallTest,
  recallPending,
  recallErrorMessage,
  recallResult,
  onRestoreDocument,
  restorePending,
  onActivateVersion,
  activateVersionPending,
}: KnowledgeDocumentDetailDialogProps) {
  const isArchived = document?.status === "archived";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent
        className="max-w-4xl"
        title={document?.title ?? "Knowledge document details"}
        bodyClassName="min-w-0 space-y-4"
      >
          <div className="flex flex-wrap gap-2">
            {isArchived ? (
              <Button variant="outline" onClick={onRestoreDocument} disabled={restorePending}>
                {restorePending ? "Restoring..." : "Restore and enable"}
              </Button>
            ) : (
              <input
                type="file"
                accept=".txt,text/plain"
                className="rounded-md border bg-background p-2 text-sm"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) {
                    return;
                  }
                  void onUploadVersionFile(file);
                }}
                disabled={versionBusy}
              />
            )}
            {selectedDocumentId && !isArchived ? (
              <Button variant="outline" onClick={onReindex}>
                Rebuild index
              </Button>
            ) : null}
          </div>

          {document ? (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">Document status: {formatStatus(document.status)}</Badge>
                <Badge variant="outline">Index status: {formatStatus(isArchived ? "idle" : (document.latestIndexStatus ?? "-"))}</Badge>
              </div>
              {document.latestIndexStatus === "failed" && document.latestIndexError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  Indexing failed: {document.latestIndexError}
                </div>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle>Retrieval test</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isArchived ? (
                    <div className="text-sm text-muted-foreground">
                      Restore this document and finish indexing to test retrieval.
                    </div>
                  ) : document.latestIndexStatus === "succeeded" ? (
                    <>
                      <div className="flex min-w-0 flex-col gap-2 md:flex-row">
                        <Input
                          value={recallQuery}
                          onChange={(event) => onRecallQueryChange(event.target.value)}
                          placeholder="Enter a question or passage to test retrieval from the active version"
                        />
                        <Button
                          onClick={onRecallTest}
                          disabled={recallPending || !selectedDocumentId || !recallQuery.trim()}
                        >
                          {recallPending ? "Testing..." : "Start test"}
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Retrieval tests use only the active, indexed version.
                      </div>
                      {recallErrorMessage ? (
                        <div className="text-sm text-destructive">{recallErrorMessage}</div>
                      ) : null}
                      {recallResult ? (
                        <div className="min-w-0 space-y-2 overflow-hidden">
                          {recallResult.hits.length === 0 ? (
                            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                              No matching passages were found for this query.
                            </div>
                          ) : (
                            recallResult.hits.map((hit, index) => (
                              <div key={hit.id} className="min-w-0 max-w-full overflow-hidden rounded-md border p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="min-w-0 break-all font-medium">
                                    Match {index + 1} | {hit.source === "reranked" ? "Reranked" : hit.source === "vector" ? "Vector" : "Keyword"} | Chunk #{hit.chunkOrder + 1}
                                  </div>
                                  <Badge variant="outline">Score {hit.score.toFixed(4)}</Badge>
                                </div>
                                {hit.title ? (
                                  <div className="mt-1 break-all text-xs text-muted-foreground">{hit.title}</div>
                                ) : null}
                                {hit.contextPrefix ? (
                                  <div className="mt-2 break-all rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                                    {hit.contextPrefix}
                                  </div>
                                ) : null}
                                <pre className="mt-3 max-h-52 w-full max-w-full overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-all rounded-md bg-muted/40 p-3 text-xs">
                                  {hit.chunkText}
                                </pre>
                              </div>
                            ))
                          )}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Finish indexing the active version to test retrieval.
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="min-w-0 space-y-3">
                {document.versions.map((version) => (
                  <div key={version.id} className="min-w-0 max-w-full overflow-hidden rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">Version v{version.versionNumber}</div>
                      {version.isActive ? <Badge>Currently active</Badge> : null}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Characters: {version.charCount.toLocaleString("en-US")} | {new Date(version.createdAt).toLocaleString("en-US")}
                    </div>
                    {!version.isActive && !isArchived ? (
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onActivateVersion(version.id)}
                          disabled={activateVersionPending}
                        >
                          Activate this version
                        </Button>
                      </div>
                    ) : null}
                    <VersionContentPreview content={version.content} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Loading document details...
            </div>
          )}
      </AppDialogContent>
    </Dialog>
  );
}
