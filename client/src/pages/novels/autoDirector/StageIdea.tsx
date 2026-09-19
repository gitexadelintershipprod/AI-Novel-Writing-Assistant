import { useEffect, useMemo, useRef, useState } from "react";
import type {
  DirectorIdeaConstellationOption,
  DirectorIdeaConstellationSelection,
  DirectorIdeaInspiration,
} from "@ai-novel/shared/types/novelDirector";
import type { NovelResourceRecommendationSource } from "@ai-novel/shared/types/novelResourceRecommendation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Layers3, Route, Sparkles, X } from "lucide-react";
import { flattenGenreTreeOptions, type GenreTreeNode } from "@/api/genre";
import { flattenStoryModeTreeOptions, type StoryModeTreeNode } from "@/api/storyMode";
import { Button } from "@/components/ui/button";
import NovelAutoDirectorIdeaInspirationPanel from "../components/NovelAutoDirectorIdeaInspirationPanel";
import OnboardingTip from "@/components/onboarding/OnboardingTip";
import StoryModeProfileDetails from "@/components/storyModes/StoryModeProfileDetails";
import CreationFoundationPickerDialog from "./CreationFoundationPickerDialog";
import StoryConstellationDialog from "./ideaConstellation/StoryConstellationDialog";
import type { FoundationConstellationOption } from "./ideaConstellation/ideaConstellationState";

interface StageIdeaProps {
  idea: string;
  onIdeaChange: (value: string) => void;
  ideaInspirations: DirectorIdeaInspiration[];
  isGeneratingIdeaInspirations: boolean;
  onGenerateIdeaInspirations: () => void;
  ideaConstellationOptions: DirectorIdeaConstellationOption[];
  isGeneratingIdeaConstellationOptions: boolean;
  isComposingIdeaConstellation: boolean;
  onGenerateIdeaConstellationOptions: () => void;
  onComposeIdeaConstellation: (selected: DirectorIdeaConstellationSelection[]) => Promise<string>;
  onContinue: () => void;
  onQuickGenerate: () => void;
  canContinue: boolean;
  isGenerating: boolean;
  genreTree: GenreTreeNode[];
  storyModeTree: StoryModeTreeNode[];
  selectedGenreId: string;
  selectedGenreLabel: string;
  selectedGenreSource?: NovelResourceRecommendationSource;
  selectedStoryModeId: string;
  selectedStoryModeLabel: string;
  selectedStoryModeSource?: NovelResourceRecommendationSource;
  genreLoading: boolean;
  genreError: boolean;
  storyModeLoading: boolean;
  storyModeError: boolean;
  isUpdatingFoundation: boolean;
  onRetryGenres: () => void;
  onRetryStoryModes: () => void;
  onFoundationChange: (patch: Partial<{
    genreId: string;
    primaryStoryModeId: string;
  }>) => Promise<boolean>;
}

function sourceLabel(source: NovelResourceRecommendationSource | undefined): string | null {
  if (source === "user_selected") return "your choice";
  if (source === "ai_recommended") return "AI matching";
  if (source === "market_recommended") return "Radar recommendation";
  return null;
}

function buildFoundationCloudOptions(
  options: Array<{ id: string; name: string; level: number; description?: string | null }>,
  selectedId: string,
  fallbackHint: string,
): FoundationConstellationOption[] {
  const nestedOptions = options.filter((option) => option.level > 0);
  const preferred = nestedOptions.length >= 3 ? nestedOptions : options;
  const selected = options.find((option) => option.id === selectedId);
  const available = selected && !preferred.some((option) => option.id === selected.id)
    ? [...preferred, selected]
    : preferred;
  return available.map((option) => ({
    id: option.id,
    label: option.name,
    hint: option.description?.trim() || fallbackHint,
  }));
}

export default function StageIdea({
  idea,
  onIdeaChange,
  ideaInspirations,
  isGeneratingIdeaInspirations,
  onGenerateIdeaInspirations,
  ideaConstellationOptions,
  isGeneratingIdeaConstellationOptions,
  isComposingIdeaConstellation,
  onGenerateIdeaConstellationOptions,
  onComposeIdeaConstellation,
  onContinue,
  onQuickGenerate,
  canContinue,
  isGenerating,
  genreTree,
  storyModeTree,
  selectedGenreId,
  selectedGenreLabel,
  selectedGenreSource,
  selectedStoryModeId,
  selectedStoryModeLabel,
  selectedStoryModeSource,
  genreLoading,
  genreError,
  storyModeLoading,
  storyModeError,
  isUpdatingFoundation,
  onRetryGenres,
  onRetryStoryModes,
  onFoundationChange,
}: StageIdeaProps) {
  const reducedMotion = useReducedMotion();
  const [showInspirations, setShowInspirations] = useState(false);
  const [constellationDialogOpen, setConstellationDialogOpen] = useState(false);
  const [genreDialogOpen, setGenreDialogOpen] = useState(false);
  const [storyModeDialogOpen, setStoryModeDialogOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimersRef = useRef<number[]>([]);
  const constellationGenreOptions = useMemo(
    () => buildFoundationCloudOptions(
      flattenGenreTreeOptions(genreTree),
      selectedGenreId,
      "This story type constrains the world, characters, and main conflict.",
    ),
    [genreTree, selectedGenreId],
  );
  const constellationStoryModeOptions = useMemo(
    () => buildFoundationCloudOptions(
      flattenStoryModeTreeOptions(storyModeTree),
      selectedStoryModeId,
      "This progression will determine how the story continues to build anticipation.",
    ),
    [selectedStoryModeId, storyModeTree],
  );

  useEffect(() => () => {
    typingTimersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(180, textarea.scrollHeight)}px`;
  }, [idea]);

  const fillIdea = (text: string) => {
    typingTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    typingTimersRef.current = [];
    setShowInspirations(false);
    if (reducedMotion) {
      onIdeaChange(text);
      return;
    }
    onIdeaChange("");
    const steps = 12;
    for (let step = 1; step <= steps; step += 1) {
      const timer = window.setTimeout(() => {
        const end = Math.ceil((text.length * step) / steps);
        onIdeaChange(text.slice(0, end));
      }, step * 18);
      typingTimersRef.current.push(timer);
    }
  };

  const useIdeaInspiration = (text: string) => {
    if (idea.trim()) {
      const confirmed = window.confirm("The starting idea above already has content. Use this inspiration and overwrite it?");
      if (!confirmed) return;
    }
    fillIdea(text);
  };

  const useConstellationIdea = (text: string) => {
    fillIdea(text);
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleOpenConstellation = () => {
    setConstellationDialogOpen(true);
    if (ideaConstellationOptions.length === 0 && !isGeneratingIdeaConstellationOptions) {
      onGenerateIdeaConstellationOptions();
    }
  };

  const handleShowInspirations = () => {
    setShowInspirations(true);
    if (ideaInspirations.length === 0 && !isGeneratingIdeaInspirations) {
      onGenerateIdeaInspirations();
    }
  };

  return (
    <section className="mx-auto flex min-h-[calc(100vh-180px)] w-full max-w-4xl flex-col items-center justify-center px-1 py-10 sm:py-16">
      <motion.div
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.2 }}
        className="w-full text-center"
      >
        <h1 className="text-3xl font-semibold tracking-normal text-foreground sm:text-[32px]">
          Start your entire book with one sentence
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
          Write down the story you want to read, and AI will first help you organize it into optional directions for the entire book.
        </p>
      </motion.div>

      <div className="mt-6 w-full">
        <OnboardingTip
          storageKey="auto-director-idea"
          title="One sentence does not need to be a complete outline"
          description="Just write down the protagonist, situation, or conflict you want to see most. The story type and progression can be left to the AI ​​or specified first below."
          next="The AI generates two distinct sets of directions for the book."
        />
      </div>

      <motion.div
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.22, delay: reducedMotion ? 0 : 0.08 }}
        className="mt-8 w-full rounded-lg bg-muted/20 p-3 shadow-[0_14px_44px_rgba(15,23,42,0.06)] transition focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/30 sm:p-4"
      >
        <textarea
          ref={textareaRef}
          className="min-h-[180px] w-full resize-none bg-transparent px-1 py-1 text-base leading-7 text-foreground outline-none placeholder:text-muted-foreground/60 sm:text-lg sm:leading-8"
          value={idea}
          onChange={(event) => onIdeaChange(event.target.value)}
          placeholder="For example: An ordinary female college student accidentally joins a supernatural organization. She goes to school and works part-time while investigating the truth behind her father's disappearance."
        />
        <div className="border-t border-border/60 pt-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">Creation preferences (optional)</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex min-w-0 flex-1 items-center rounded-md bg-background/65 ring-1 ring-border/70">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-muted/45 disabled:opacity-50"
                onClick={() => setGenreDialogOpen(true)}
                disabled={isGenerating || isUpdatingFoundation}
              >
                <Layers3 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">
                  {selectedGenreLabel || "Story type: AI will match this"}
                </span>
                {sourceLabel(selectedGenreSource) ? (
                  <span className="shrink-0 text-[11px] text-muted-foreground">{sourceLabel(selectedGenreSource)}</span>
                ) : null}
              </button>
              {selectedGenreId ? (
                <button
                  type="button"
                  className="mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Clear story type"
                  disabled={isGenerating || isUpdatingFoundation}
                  onClick={() => void onFoundationChange({ genreId: "" })}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-1 items-center rounded-md bg-background/65 ring-1 ring-border/70">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-muted/45 disabled:opacity-50"
                onClick={() => setStoryModeDialogOpen(true)}
                disabled={isGenerating || isUpdatingFoundation}
              >
                <Route className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">
                  {selectedStoryModeLabel || "Progression mode: AI will match this"}
                </span>
                {sourceLabel(selectedStoryModeSource) ? (
                  <span className="shrink-0 text-[11px] text-muted-foreground">{sourceLabel(selectedStoryModeSource)}</span>
                ) : null}
              </button>
              {selectedStoryModeId ? (
                <button
                  type="button"
                  className="mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Clear progression mode"
                  disabled={isGenerating || isUpdatingFoundation}
                  onClick={() => void onFoundationChange({ primaryStoryModeId: "" })}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
          {(genreError || storyModeError) ? (
            <div className="mt-2 text-xs text-muted-foreground">
              Some of the optional directions are not loaded yet, you can still let AI automatically match them and continue.
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleOpenConstellation}
              disabled={isGenerating || isComposingIdeaConstellation}
            >
              <Sparkles className="h-4 w-4" />
              Open the story star map
            </Button>
            <button
              type="button"
              className="text-sm text-muted-foreground transition hover:text-foreground disabled:opacity-50"
              onClick={handleShowInspirations}
              disabled={isGeneratingIdeaInspirations}
            >
              {isGeneratingIdeaInspirations ? "Working on a few ideas..." : "Just give me some ideas"}
            </button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              className="text-sm text-muted-foreground transition hover:text-foreground disabled:opacity-50"
              onClick={onQuickGenerate}
              disabled={!canContinue || isGenerating}
            >
              {isGenerating ? "Generating..." : "Generate directions directly with default settings"}
            </button>
            <Button type="button" onClick={onContinue} disabled={!canContinue}>
              Continue to improve settings
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {showInspirations && (ideaInspirations.length > 0 || isGeneratingIdeaInspirations) ? (
        <motion.div
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.18 }}
          className="w-full"
        >
          <NovelAutoDirectorIdeaInspirationPanel
            ideas={ideaInspirations}
            isGenerating={isGeneratingIdeaInspirations}
            onGenerate={onGenerateIdeaInspirations}
            onUseIdea={useIdeaInspiration}
          />
        </motion.div>
      ) : null}

      <StoryConstellationDialog
        open={constellationDialogOpen}
        onOpenChange={setConstellationDialogOpen}
        options={ideaConstellationOptions}
        genreOptions={constellationGenreOptions}
        storyModeOptions={constellationStoryModeOptions}
        selectedGenreId={selectedGenreId}
        selectedStoryModeId={selectedStoryModeId}
        isUpdatingFoundation={isUpdatingFoundation}
        isGenerating={isGeneratingIdeaConstellationOptions}
        isComposing={isComposingIdeaConstellation}
        onGenerate={onGenerateIdeaConstellationOptions}
        onSelectGenre={(genreId) => onFoundationChange({ genreId })}
        onSelectStoryMode={(primaryStoryModeId) => onFoundationChange({ primaryStoryModeId })}
        onCompose={onComposeIdeaConstellation}
        onUseIdea={useConstellationIdea}
      />

      <CreationFoundationPickerDialog
        open={genreDialogOpen}
        onOpenChange={setGenreDialogOpen}
        title="Select story type"
        description="This choice will constrain the subsequent direction, world, characters and plot planning; if you are unsure, just leave it to the AI."
        treeTitle="Subject Catalog"
        nodes={genreTree}
        selectedId={selectedGenreId}
        autoLabel="Leave it to AI to match story types"
        emptyLabel="The theme base library is temporarily empty and can be handed over to AI for automatic processing first."
        loading={genreLoading}
        error={genreError}
        applying={isUpdatingFoundation}
        onRetry={onRetryGenres}
        onApply={(genreId) => onFoundationChange({ genreId })}
      />

      <CreationFoundationPickerDialog
        open={storyModeDialogOpen}
        onOpenChange={setStoryModeDialogOpen}
        title="Choose the main method of promotion"
        description="It determines what the story mainly relies on to continue to be exciting; the auxiliary advancement method is still automatically supplemented by AI."
        treeTitle="Advance mode directory"
        nodes={storyModeTree}
        selectedId={selectedStoryModeId}
        autoLabel="Leave it to AI to match the propulsion method"
        emptyLabel="The propulsion mode library is temporarily empty and can be handed over to AI for automatic processing first."
        loading={storyModeLoading}
        error={storyModeError}
        applying={isUpdatingFoundation}
        onRetry={onRetryStoryModes}
        onApply={(primaryStoryModeId) => onFoundationChange({ primaryStoryModeId })}
        renderDetails={(node) => <StoryModeProfileDetails node={node} eyebrow="Current selection" />}
      />
    </section>
  );
}
