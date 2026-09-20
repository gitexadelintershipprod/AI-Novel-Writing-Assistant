import { useRef, type ReactNode } from "react";
import { Image as ImageIcon, Loader2, Sparkles, Trash2, Upload } from "lucide-react";

export type GeneratedImageCardStatus = "idle" | "generating" | "done" | "error";

const STATUS_DOT: Record<GeneratedImageCardStatus, string> = {
  idle: "bg-muted-foreground/30",
  generating: "bg-sky-500 animate-pulse",
  done: "bg-emerald-500",
  error: "bg-rose-500",
};

const STATUS_TITLE: Record<GeneratedImageCardStatus, string> = {
  idle: "Not generated",
  generating: "Generating",
  done: "Ready",
  error: "Build failed",
};

const SIZE_STYLE: Record<NonNullable<GeneratedImageCardProps["size"]>, string> = {
  compact: "h-24",
  regular: "h-36",
  large: "h-48",
};

const ASPECT_STYLE: Record<NonNullable<GeneratedImageCardProps["aspectRatio"]>, string> = {
  square: "aspect-square",
  portrait: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
};

export interface GeneratedImageCardProps {
  /** Current generation status (drives placeholder / loading / error UI). */
  status: GeneratedImageCardStatus;
  /** Image URL when ready. */
  imageUrl?: string;
  /** Optional error text on error (shown as a hover title). */
  errorMessage?: string;

  /** Card title */
  title: string;
  /** Card subtitle / description (line-clamp-2) */
  subtitle?: string;
  /** Type badge { label, className (Tailwind classes) } */
  typeBadge?: { label: string; className: string };

  /** Primary action: AI generate (or regenerate). Omit to hide. */
  onGenerate?: () => void;
  /** Secondary action: upload an image. Omit to hide. */
  onUpload?: (file: File) => void;
  /** Delete action: shown on hover. Omit to hide. */
  onDelete?: () => void;
  /** External busy (mutation pending) plus generating both disable actions. */
  busy?: boolean;

  /** Image-area height */
  size?: "compact" | "regular" | "large";
  /** Image-area aspect ratio (wins over size when both are set). */
  aspectRatio?: "square" | "portrait" | "landscape";

  /** Custom empty-state content */
  emptyHint?: ReactNode;
  /** Custom footer (extra actions, hints) */
  footer?: ReactNode;

  /** Primary button label; default idle="AI generated pictures" / done="Regenerate" */
  generateLabel?: string;
  /** Confirm text before delete; omit to skip the confirm dialog. */
  confirmDeleteText?: string;
}

/**
 * Shared generated-image card.
 *
 * Covers display and basic actions for JSON-state-machine image jobs such as
 * character assets, scene setting sheets, and expression drafts.
 * Does not cover: three-view main design drafts (custom tweak flow) or panel
 * grids (redraw / export / extra dialogs) — those stay as dedicated implementations.
 */
export function GeneratedImageCard({
  status,
  imageUrl,
  errorMessage,
  title,
  subtitle,
  typeBadge,
  onGenerate,
  onUpload,
  onDelete,
  busy = false,
  size = "regular",
  aspectRatio,
  emptyHint,
  footer,
  generateLabel,
  confirmDeleteText,
}: GeneratedImageCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isGenerating = busy || status === "generating";
  const hasDoneImage = status === "done" && Boolean(imageUrl);

  const imageWrapperClass = aspectRatio ? ASPECT_STYLE[aspectRatio] : SIZE_STYLE[size];

  return (
    <div className="group relative overflow-hidden rounded-lg border bg-background shadow-sm transition-shadow hover:shadow-md">
      {/* Status dot */}
      <span
        title={STATUS_TITLE[status]}
        className={`absolute top-1.5 right-1.5 z-10 h-2 w-2 rounded-full ring-2 ring-background ${STATUS_DOT[status]}`}
      />

      {/* Delete button: visible on hover */}
      {onDelete && (
        <button
          type="button"
          title="Delete"
          disabled={busy}
          className="absolute top-1.5 left-1.5 z-10 rounded-md bg-background/85 p-1 text-muted-foreground/70 opacity-0 backdrop-blur-sm transition-opacity hover:bg-destructive hover:text-white group-hover:opacity-100 disabled:opacity-50"
          onClick={() => {
            if (!confirmDeleteText || window.confirm(confirmDeleteText)) onDelete();
          }}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}

      {/* Image area */}
      <div className={`relative flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/60 ${imageWrapperClass}`}>
        {hasDoneImage ? (
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : isGenerating ? (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-[10px]">Generating</span>
          </div>
        ) : status === "error" ? (
          <div className="flex flex-col items-center gap-1 px-2 text-center text-rose-600 dark:text-rose-400" title={errorMessage}>
            <ImageIcon className="h-6 w-6 opacity-50" />
            <span className="text-[10px]">Generation failed, you can try again</span>
          </div>
        ) : emptyHint ? (
          <>{emptyHint}</>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
            <ImageIcon className="h-7 w-7" />
            <span className="text-[10px]">To be generated</span>
          </div>
        )}
      </div>

      {/* Info area */}
      <div className="space-y-1.5 px-2.5 pb-2 pt-2">
        <div className="flex items-center gap-1.5">
          {typeBadge && (
            <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-medium leading-none ${typeBadge.className}`}>
              {typeBadge.label}
            </span>
          )}
          <p className="min-w-0 flex-1 truncate text-xs font-semibold">{title}</p>
        </div>
        {subtitle && (
          <p className="line-clamp-2 text-[10px] leading-relaxed text-muted-foreground" title={subtitle}>
            {subtitle}
          </p>
        )}

        {/* Actions */}
        {(onGenerate || onUpload) && (
          <div className="flex items-center gap-1.5 pt-0.5">
            {onGenerate && (
              <button
                type="button"
                disabled={isGenerating}
                className="flex flex-1 items-center justify-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                onClick={onGenerate}
              >
                {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {generateLabel ?? (hasDoneImage ? "Regenerate" : "AI generated pictures")}
              </button>
            )}
            {onUpload && (
              <button
                type="button"
                title="Upload images instead of AI generation"
                disabled={isGenerating}
                className="rounded-md border px-1.5 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {footer}

        {onUpload && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
        )}
      </div>
    </div>
  );
}
