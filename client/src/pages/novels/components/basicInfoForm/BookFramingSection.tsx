import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { BASIC_INFO_FIELD_HINTS, type NovelBasicFormState } from "../../novelBasicInfo.shared";
import { FieldLabel } from "./BasicInfoFormPrimitives";

interface BookFramingSectionProps {
  basicForm: NovelBasicFormState;
  onFormChange: (patch: Partial<NovelBasicFormState>) => void;
  quickFill?: ReactNode;
}

export function BookFramingSection(props: BookFramingSectionProps) {
  const { basicForm, onFormChange, quickFill } = props;

  return (
    <div className="space-y-4 pt-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">Readers and selling points</div>
          <div className="mt-1 text-sm leading-6 text-muted-foreground">
            State plainly who this book is for, what makes it compelling, and what readers will get from the first 30 chapters. You do not need professional planning language—describe it in your own words.
          </div>
        </div>
        {quickFill ? <div className="shrink-0">{quickFill}</div> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel htmlFor="basic-target-audience" hint={BASIC_INFO_FIELD_HINTS.targetAudience}>
            Target audience
          </FieldLabel>
          <Input
            id="basic-target-audience"
            value={basicForm.targetAudience}
            placeholder="For example: Readers who enjoy high-stakes urban comebacks, tense relationships, and strong serial hooks"
            onChange={(event) => onFormChange({ targetAudience: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="basic-commercial-tags" hint={BASIC_INFO_FIELD_HINTS.commercialTagsText}>
            Core business tags
          </FieldLabel>
          <Input
            id="basic-commercial-tags"
            value={basicForm.commercialTagsText}
            placeholder="For example: comeback, high conflict, suspense, workplace rivalry"
            onChange={(event) => onFormChange({ commercialTagsText: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="basic-competing-feel" hint={BASIC_INFO_FIELD_HINTS.competingFeel}>
            Comparable reading feel
          </FieldLabel>
          <Input
            id="basic-competing-feel"
            value={basicForm.competingFeel}
            placeholder="For example: workplace pressure with dry humor and intense relationship tension"
            onChange={(event) => onFormChange({ competingFeel: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="basic-book-selling-point" hint={BASIC_INFO_FIELD_HINTS.bookSellingPoint}>
            Core selling point
          </FieldLabel>
          <textarea
            id="basic-book-selling-point"
            rows={3}
            className="min-h-[96px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            value={basicForm.bookSellingPoint}
            placeholder="For example: Every problem the protagonist solves exposes a larger web of relationships and interests, keeping readers eager for the next reversal."
            onChange={(event) => onFormChange({ bookSellingPoint: event.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="basic-first30-promise" hint={BASIC_INFO_FIELD_HINTS.first30ChapterPromise}>
          First 30-chapter promise
        </FieldLabel>
        <textarea
          id="basic-first30-promise"
          rows={5}
          className="min-h-[128px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          value={basicForm.first30ChapterPromise}
          placeholder="For example: In the first 30 chapters, establish the protagonist's position, reveal the central rival, deliver the first major relationship reversal, and signal that the stakes will keep rising."
          onChange={(event) => onFormChange({ first30ChapterPromise: event.target.value })}
        />
      </div>
    </div>
  );
}
