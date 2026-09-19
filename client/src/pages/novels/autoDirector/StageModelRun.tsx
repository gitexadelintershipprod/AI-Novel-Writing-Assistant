import { BookOpen, GitBranch, Settings2, Sparkles } from "lucide-react";
import LLMSelector from "@/components/common/LLMSelector";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";
import type { NovelBasicFormState } from "../novelBasicInfo.shared";

interface StageModelRunProps {
  basicForm: NovelBasicFormState;
  onBasicFormChange: (patch: Partial<NovelBasicFormState>) => void;
  canGenerate: boolean;
  isGenerating: boolean;
  onBack: () => void;
  onGenerate: () => void;
}

export default function StageModelRun({
  basicForm,
  onBasicFormChange,
  canGenerate,
  isGenerating,
  onBack,
  onGenerate,
}: StageModelRunProps) {
  return (
    <section className="mx-auto w-full max-w-5xl space-y-7 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-2xl font-semibold tracking-normal text-foreground">Confirm model and production preparation</div>
          <div className={`mt-2 max-w-2xl text-sm leading-6 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            After confirmation, the AI will first give two sets of directions for the entire book, and then automatically complete the preparation of characters and chapters before writing.
          </div>
        </div>
        <div className="rounded-full bg-muted/55 px-3 py-1 text-xs text-muted-foreground">
          Last step before starting
        </div>
      </div>

      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-[0_20px_55px_-45px_hsl(var(--foreground)/0.5)]">
          <div className="border-b border-border/60 bg-muted/15 px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <GitBranch className="h-4 w-4 text-primary" />
              The automatic director will advance like this
            </div>
          </div>
          <div className="grid gap-px bg-border/60 md:grid-cols-3">
            <div className="bg-background p-5">
              <Sparkles className="h-5 w-5 text-primary" />
              <div className="mt-3 text-sm font-semibold text-foreground">1. Select the book direction</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">The AI generates two distinct sets of directions, and it's up to you to choose one.</div>
            </div>
            <div className="bg-background p-5">
              <BookOpen className="h-5 w-5 text-primary" />
              <div className="mt-3 text-sm font-semibold text-foreground">2. Automatically prepare to start writing</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">The system completes characters, volume strategies, chapter splitting and chapter execution resources.</div>
            </div>
            <div className="bg-background p-5">
              <Settings2 className="h-5 w-5 text-primary" />
              <div className="mt-3 text-sm font-semibold text-foreground">3. Select text production method</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">Simple creation uses AI to write the entire book; professional creation enters the complete workbench.</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-primary/10 bg-primary/[0.05] px-5 py-3 text-xs">
            <span className="font-medium text-foreground">The text will stop waiting for your choice before starting to write.</span>
            <span className="text-muted-foreground">Chapter text will not be generated in advance</span>
          </div>
        </section>

        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground">Go to AI detection and correction after the text</div>
            <div className={`text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
              When turned on, AI-flavored risks will be detected when chapter text generation is completed, and revised drafts will be generated when correctable problems are hit.
            </div>
          </div>
          <Switch
            aria-label="Go to AI detection and correction after the text"
            checked={basicForm.postGenerationStyleReviewEnabled}
            onCheckedChange={(checked) => onBasicFormChange({ postGenerationStyleReviewEnabled: checked })}
          />
        </div>

        <details className="group rounded-2xl border border-border/70 bg-background px-5 py-4">
          <summary className="cursor-pointer list-none">
            <div className="text-sm font-medium text-foreground">Model settings</div>
            <div className={`mt-1 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
              Adjust the model, temperature and output upper limit used for this book opening. Structural planning recommends keeping the temperature between 0.3 and 0.7.
            </div>
          </summary>
          <div className="mt-4">
            <LLMSelector showParameters />
          </div>
        </details>
      </div>

      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>Return to the world and writing methods</Button>
        <Button type="button" onClick={onGenerate} disabled={!canGenerate}>
          {isGenerating ? "Generating..." : "Start generating directions"}
        </Button>
      </div>
    </section>
  );
}
