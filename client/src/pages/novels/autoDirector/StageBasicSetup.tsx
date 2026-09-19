import { useState } from "react";
import type { NovelBasicFormState } from "../novelBasicInfo.shared";
import {
  BASIC_INFO_FIELD_HINTS,
  EMOTION_OPTIONS,
  PACE_OPTIONS,
  POV_OPTIONS,
  READER_CHANNEL_OPTIONS,
  WRITING_PLATFORM_OPTIONS,
} from "../novelBasicInfo.shared";
import { parseEstimatedChapterCountInput } from "./estimatedChapterCountInput";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";
import { BookFramingQuickFillButton } from "../components/basicInfoForm/BookFramingQuickFillButton";
import {
  FieldLabel,
  findOptionSummary,
} from "../components/basicInfoForm/BasicInfoFormPrimitives";
import SelectControl from "@/components/common/SelectControl";

interface StageBasicSetupProps {
  basicForm: NovelBasicFormState;
  genreOptions: Array<{ id: string; path: string; label: string }>;
  idea: string;
  onBasicFormChange: (patch: Partial<NovelBasicFormState>) => void;
  onBack: () => void;
  onConfirm: () => void;
}

export default function StageBasicSetup({
  basicForm,
  genreOptions,
  idea,
  onBasicFormChange,
  onBack,
  onConfirm,
}: StageBasicSetupProps) {
  const [estimatedChapterCountDraft, setEstimatedChapterCountDraft] = useState<string | null>(null);
  const hasLargeChapterPlan = basicForm.estimatedChapterCount > 200;
  const controlClassName = "w-full rounded-lg border-0 bg-muted/40 px-3 py-2.5 text-sm outline-none ring-1 ring-transparent transition hover:bg-muted/55 focus:bg-background focus:ring-2 focus:ring-primary/25";

  return (
    <section className="mx-auto w-full max-w-5xl space-y-7 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-2xl font-semibold tracking-normal text-foreground">Decide on the feel of this book first</div>
          <div className={`mt-2 max-w-2xl text-sm leading-6 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            Here we only confirm the basic parameters that affect the reading experience of the entire book. Leave the default when unsure and the AI ​​will continue to base its judgment on your starting thoughts.
          </div>
        </div>
        <div className="rounded-full bg-muted/55 px-3 py-1 text-xs text-muted-foreground">
          about 1 minute
        </div>
      </div>

      <div className="flex items-start gap-3 border-y border-border/60 py-4">
        <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
        <div>
          <div className="text-sm font-medium text-foreground">AI will automatically determine the creative base</div>
          <div className={`mt-1 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            The system will determine the theme and main advancement method based on the initial idea, and run it through direction planning, text, inspection and repair. After creation, you can still adjust subsequent writing methods in the work settings.
          </div>
        </div>
      </div>

      <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel htmlFor="director-basic-platform" hint="Decide what kind of platform reading will be used for planning, copywriting, review and restoration.">target platform</FieldLabel>
          <SelectControl
            id="director-basic-platform"
            className={controlClassName}
            value={basicForm.writingPlatformPreference}
            onChange={(event) => onBasicFormChange({ writingPlatformPreference: event.target.value as NovelBasicFormState["writingPlatformPreference"] })}
          >
            {WRITING_PLATFORM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SelectControl>
          <div className={`text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            {findOptionSummary(WRITING_PLATFORM_OPTIONS, basicForm.writingPlatformPreference)}
          </div>
        </div>
        <div className="space-y-2">
          <FieldLabel htmlFor="director-basic-reader-channel" hint={BASIC_INFO_FIELD_HINTS.readerChannelPreference}>Reader channel tendencies</FieldLabel>
          <SelectControl
            id="director-basic-reader-channel"
            className={controlClassName}
            value={basicForm.readerChannelPreference}
            onChange={(event) => onBasicFormChange({
              readerChannelPreference: event.target.value as NovelBasicFormState["readerChannelPreference"],
            })}
          >
            {READER_CHANNEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </SelectControl>
          <div className={`text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            {findOptionSummary(READER_CHANNEL_OPTIONS, basicForm.readerChannelPreference)}
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="director-basic-pov" hint={BASIC_INFO_FIELD_HINTS.narrativePov}>narrative perspective</FieldLabel>
          <SelectControl
            id="director-basic-pov"
            className={controlClassName}
            value={basicForm.narrativePov}
            onChange={(event) => onBasicFormChange({
              narrativePov: event.target.value as NovelBasicFormState["narrativePov"],
            })}
          >
            {POV_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </SelectControl>
          <div className={`text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            {findOptionSummary(POV_OPTIONS, basicForm.narrativePov)}
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="director-basic-pace" hint={BASIC_INFO_FIELD_HINTS.pacePreference}>rhythm preference</FieldLabel>
          <SelectControl
            id="director-basic-pace"
            className={controlClassName}
            value={basicForm.pacePreference}
            onChange={(event) => onBasicFormChange({
              pacePreference: event.target.value as NovelBasicFormState["pacePreference"],
            })}
          >
            {PACE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </SelectControl>
          <div className={`text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            {findOptionSummary(PACE_OPTIONS, basicForm.pacePreference)}
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="director-basic-emotion" hint={BASIC_INFO_FIELD_HINTS.emotionIntensity}>emotional concentration</FieldLabel>
          <SelectControl
            id="director-basic-emotion"
            className={controlClassName}
            value={basicForm.emotionIntensity}
            onChange={(event) => onBasicFormChange({
              emotionIntensity: event.target.value as NovelBasicFormState["emotionIntensity"],
            })}
          >
            {EMOTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </SelectControl>
          <div className={`text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            {findOptionSummary(EMOTION_OPTIONS, basicForm.emotionIntensity)}
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="director-basic-estimated" hint={BASIC_INFO_FIELD_HINTS.estimatedChapterCount}>Estimated number of chapters</FieldLabel>
          <Input
            id="director-basic-estimated"
            type="number"
            min={1}
            max={2000}
            className={controlClassName}
            value={estimatedChapterCountDraft ?? String(basicForm.estimatedChapterCount)}
            onChange={(event) => {
              const draft = event.target.value;
              setEstimatedChapterCountDraft(draft);
              const estimatedChapterCount = parseEstimatedChapterCountInput(draft);
              if (estimatedChapterCount !== null) {
                onBasicFormChange({ estimatedChapterCount });
              }
            }}
            onBlur={() => setEstimatedChapterCountDraft(null)}
          />
          <div className={`text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            It will be used as a reference for the structural density of the entire book and the planning of subsequent chapters, and is not a hard upper limit.
          </div>
          {basicForm.estimatedChapterCount <= 60 ? (
            <div className={`rounded-lg bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900 ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
              Compact book mode: AI will complete the complete ending within a limited space, and add up to 5 additional chapters if necessary.
            </div>
          ) : null}
          {hasLargeChapterPlan ? (
            <div className={`rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
              It is recommended to try it on a small scale first: check the planning and early chapter directions first, and then expand the output scope after confirming that it meets your ideas.
            </div>
          ) : null}
        </div>
      </div>

      <details className="group pt-2">
        <summary className="cursor-pointer list-none">
          <div>
            <div className="text-base font-semibold text-foreground">Supplement readers and selling points</div>
            <div className={`mt-1 max-w-3xl text-sm leading-6 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
              If you are not sure, you can skip it first. After supplementation, the AI ​​will have a clearer idea of ​​who the book is for and what the first 30 chapters should give readers.
            </div>
          </div>
        </summary>

        <div className="mt-5 flex justify-start">
          <BookFramingQuickFillButton
            basicForm={basicForm}
            genreOptions={genreOptions}
            descriptionOverride={idea}
            onApplySuggestion={onBasicFormChange}
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel htmlFor="director-basic-target-audience" hint={BASIC_INFO_FIELD_HINTS.targetAudience}>
              target audience
            </FieldLabel>
            <Input
              id="director-basic-target-audience"
              className={controlClassName}
              value={basicForm.targetAudience}
              placeholder="For example: Readers who like to watch urban high-pressure counterattacks, relationship pulls, and constant pursuit of hooks"
              onChange={(event) => onBasicFormChange({ targetAudience: event.target.value })}
            />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="director-basic-commercial-tags" hint={BASIC_INFO_FIELD_HINTS.commercialTagsText}>
              core business tags
            </FieldLabel>
            <Input
              id="director-basic-commercial-tags"
              className={controlClassName}
              value={basicForm.commercialTagsText}
              placeholder="For example: counterattack, strong conflict, full of suspense, workplace game"
              onChange={(event) => onBasicFormChange({ commercialTagsText: event.target.value })}
            />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="director-basic-competing-feel" hint={BASIC_INFO_FIELD_HINTS.competingFeel}>
              Competitive product sense/familiar reading sense
            </FieldLabel>
            <Input
              id="director-basic-competing-feel"
              className={controlClassName}
              value={basicForm.competingFeel}
              placeholder="For example: a bit of cold humor and high-density relationship tension in the real workplace pressure"
              onChange={(event) => onBasicFormChange({ competingFeel: event.target.value })}
            />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="director-basic-book-selling-point" hint={BASIC_INFO_FIELD_HINTS.bookSellingPoint}>
              The core selling point of this book
            </FieldLabel>
            <textarea
              id="director-basic-book-selling-point"
              rows={3}
              className={`${controlClassName} min-h-[96px] resize-y`}
              value={basicForm.bookSellingPoint}
              placeholder="For example: every time the protagonist solves a real-life dilemma, he will leverage a larger chain of relationships and interests, and readers will always look forward to the next counter-pressure."
              onChange={(event) => onBasicFormChange({ bookSellingPoint: event.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="director-basic-first30-promise" hint={BASIC_INFO_FIELD_HINTS.first30ChapterPromise}>
            First 30 Chapters Promise
          </FieldLabel>
          <textarea
            id="director-basic-first30-promise"
            rows={4}
            className={`${controlClassName} min-h-[120px] resize-y`}
            value={basicForm.first30ChapterPromise}
            placeholder="For example: the first 30 chapters must allow readers to see the protagonist take a firm stand in the first stage, the core opponent emerges, and the relationship line reverses for the first time, and it must be clear that the book will become more and more ruthless later on."
            onChange={(event) => onBasicFormChange({ first30ChapterPromise: event.target.value })}
          />
        </div>
      </details>

      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>return ideas</Button>
        <Button type="button" onClick={onConfirm}>Confirm initial settings</Button>
      </div>
    </section>
  );
}
