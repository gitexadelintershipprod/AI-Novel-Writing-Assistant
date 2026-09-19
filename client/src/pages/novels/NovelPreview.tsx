import { useEffect, useMemo, useState } from "react";
import type { Chapter, ChapterStatus } from "@ai-novel/shared/types/novel";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Check, Copy, Download, Edit3, List, Settings2, X } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { downloadNovelExport, getNovelChapters, getNovelDetail } from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function countWords(content: string | null | undefined): number {
  const text = content?.trim() ?? "";
  if (!text) return 0;
  const cjk = text.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const words = text.replace(/[\u3400-\u9fff]/g, " ").match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g)?.length ?? 0;
  return cjk + words;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatChapterStatus(status?: ChapterStatus | null): string {
  switch (status) {
    case "completed": return "Text completed";
    case "pending_review": return "To be reviewed";
    case "needs_repair": return "To be fixed";
    case "generating": return "Generating";
    case "pending_generation": return "To be generated";
    case "unplanned": return "Not planned";
    default: return "Unmarked";
  }
}

function chapterText(content: string | null | undefined): string {
  return content?.trim() ?? "";
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "true");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    document.body.removeChild(area);
  }
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeFileNamePart(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "-").trim() || "Novel";
}

export default function NovelPreview() {
  const { id = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showChapters, setShowChapters] = useState(true);
  const [copied, setCopied] = useState(false);
  const selectedChapterId = searchParams.get("chapterId") ?? "";

  const novelQuery = useQuery({
    queryKey: queryKeys.novels.detail(id),
    queryFn: () => getNovelDetail(id),
    enabled: Boolean(id),
  });
  const chaptersQuery = useQuery({
    queryKey: queryKeys.novels.chapters(id),
    queryFn: () => getNovelChapters(id),
    enabled: Boolean(id),
  });

  const novel = novelQuery.data?.data ?? null;
  const chapters = useMemo(
    () => [...(chaptersQuery.data?.data ?? [])].sort((a, b) => a.order - b.order),
    [chaptersQuery.data?.data],
  );
  const generatedChapters = useMemo(() => chapters.filter((chapter) => chapterText(chapter.content)), [chapters]);
  const activeChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === selectedChapterId) ?? generatedChapters[0] ?? chapters[0] ?? null,
    [chapters, generatedChapters, selectedChapterId],
  );
  const activeContent = chapterText(activeChapter?.content);
  const totalWordCount = useMemo(() => chapters.reduce((sum, chapter) => sum + countWords(chapter.content), 0), [chapters]);
  const downloadFullMutation = useMutation({
    mutationFn: () => downloadNovelExport(id, "txt", "full", novel?.title),
    onSuccess: ({ blob, fileName }) => {
      downloadBlob(blob, fileName);
      toast.success("Download of the entire text has begun.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to download the entire text."),
  });

  useEffect(() => {
    if (!activeChapter || selectedChapterId === activeChapter.id) return;
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("chapterId", activeChapter.id);
      return next;
    }, { replace: true });
  }, [activeChapter, selectedChapterId, setSearchParams]);

  const selectChapter = (chapter: Chapter) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("chapterId", chapter.id);
      return next;
    });
    if (!window.matchMedia("(min-width: 1024px)").matches) {
      setShowChapters(false);
    }
  };

  const handleCopy = async () => {
    if (!activeContent) return toast.error("There is no text for the current chapter.");
    try {
      await copyText(activeContent);
      setCopied(true);
      toast.success("The text has been copied.");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Copy failed, please manually select the text to copy.");
    }
  };

  const handleDownloadChapter = () => {
    if (!activeChapter || !activeContent) return toast.error("There is no text for the current chapter.");
    const title = safeFileNamePart(novel?.title ?? "Novel");
    const chapterTitle = activeChapter.title?.trim() ? safeFileNamePart(activeChapter.title) : "";
    downloadBlob(
      new Blob(["\uFEFF", `Chapter ${activeChapter.order}${chapterTitle ? ` ${chapterTitle}` : ""}\n\n${activeContent}`], { type: "text/plain;charset=utf-8" }),
      `${title}-Chapter ${activeChapter.order}${chapterTitle ? `-${chapterTitle}` : ""}.txt`,
    );
    toast.success("Downloading of the text of this chapter has started.");
  };

  if (!id) {
    return <div className="flex min-h-full items-center justify-center"><Button asChild><Link to="/novels">Return to novel list</Link></Button></div>;
  }

  const isLoading = novelQuery.isPending || chaptersQuery.isPending;
  const isError = novelQuery.isError || chaptersQuery.isError;

  if (isLoading) {
    return <div className="flex min-h-full items-center justify-center text-sm text-muted-foreground">Opening work...</div>;
  }
  if (isError) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-muted-foreground">This work cannot be opened at the moment.</p>
        <Button onClick={() => { void novelQuery.refetch(); void chaptersQuery.refetch(); }}>reload</Button>
      </div>
    );
  }
  if (chapters.length === 0) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 text-center">
        <BookOpen className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">This work has no chapters to read yet.</p>
        <Button asChild><Link to={`/novels/${id}/edit`}>Enter workspace</Link></Button>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-y-auto bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className={cn("mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5 transition-[padding]", showChapters && "lg:pl-[22.5rem]")}>
          <div className="flex items-center gap-1">
            {!showChapters ? (
              <Button type="button" variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground" onClick={() => setShowChapters(true)} title="Open directory" aria-label="Open directory">
                <List className="h-4 w-4" />
              </Button>
            ) : null}
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Link to="/novels" aria-label="Return to bookshelf"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="min-w-0 flex-1 text-center">
            <div className="truncate text-sm font-medium">{novel?.title ?? "Novel preview"}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{activeChapter ? `Chapter ${activeChapter.order}` : "read"}</div>
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={handleDownloadChapter} disabled={!activeContent} title="Download this chapter" aria-label="Download this chapter">
              <Download className="h-4 w-4" /><span className="ml-1.5 hidden xl:inline">this chapter</span>
            </Button>
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => downloadFullMutation.mutate()} disabled={downloadFullMutation.isPending || generatedChapters.length === 0} title="Download the entire book" aria-label="Download the entire book">
              <BookOpen className="h-4 w-4" /><span className="ml-1.5 hidden xl:inline">The whole book</span>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" title="Open workspace" aria-label="Open workspace">
              <Link to={`/novels/${id}/edit`}><Settings2 className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </header>

      <main className={cn("px-6 pb-24 pt-16 transition-[padding] sm:px-10 sm:pt-20", showChapters && "lg:pl-[22.5rem]")}>
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
          <div className="text-xs tracking-[0.22em] text-muted-foreground">{novel?.status === "published" ? "PUBLISHED" : "DRAFT"}</div>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">{novel?.title ?? "Novel preview"}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{formatCount(totalWordCount)} characters · {generatedChapters.length}/{chapters.length} Chapter has been generated</p>
          </div>

          <article className="whitespace-pre-wrap text-[17px] leading-[2.15] text-foreground sm:text-[18px]">
            {activeContent || "There is no text for this chapter yet."}
          </article>

          <footer className="mt-20 flex items-center justify-center gap-2 border-t border-border/70 pt-6">
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => void handleCopy()} disabled={!activeContent}>
              {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copied ? "Copied" : "Copy this chapter"}
            </Button>
            {activeChapter ? (
                <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
                <Link to={`/novels/${id}/chapters/${activeChapter.id}`}><Edit3 className="mr-1.5 h-4 w-4" />Edit this chapter</Link>
              </Button>
            ) : null}
          </footer>
        </div>
      </main>

      {showChapters ? (
        <>
          <button type="button" aria-label="Close directory" className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" onClick={() => setShowChapters(false)} />
          <aside className="fixed inset-y-0 left-0 z-40 flex w-[min(360px,88vw)] flex-col border-r border-border bg-background shadow-xl lg:shadow-none">
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
              <div><div className="font-medium">Directory</div><div className="mt-1 text-xs text-muted-foreground">{generatedChapters.length}/{chapters.length} chapter · {formatCount(totalWordCount)} characters</div></div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowChapters(false)} title="Close directory" aria-label="Close directory"><X className="h-4 w-4" /></Button>
            </div>
            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
              {chapters.map((chapter) => {
                const hasContent = Boolean(chapterText(chapter.content));
                return (
                  <button key={chapter.id} type="button" className={cn("w-full rounded-md px-3 py-3 text-left transition hover:bg-muted/70", activeChapter?.id === chapter.id && "bg-muted")} onClick={() => selectChapter(chapter)}>
                    <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">Chapter {chapter.order}</span><span className="text-xs text-muted-foreground">{formatCount(countWords(chapter.content))} characters</span></div>
                    <div className="mt-1 truncate text-sm text-muted-foreground">{chapter.title || "Unnamed chapter"}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{hasContent ? formatChapterStatus(chapter.chapterStatus) : "No text yet"}</div>
                  </button>
                );
              })}
            </nav>
          </aside>
        </>
      ) : null}
    </div>
  );
}
