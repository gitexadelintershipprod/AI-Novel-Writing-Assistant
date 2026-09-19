import { GitBranch } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { WorldStructuredData } from "@ai-novel/shared/types/world";
import { Button } from "@/components/ui/button";
import { HandbookField, HandbookTextarea, SectionHeader } from "./HandbookPrimitives";
import { listToText, textToList } from "./handbookEditorUtils";

export default function WorldHandbookTensionSection(props: {
  draftStructure: WorldStructuredData;
  setDraftStructure: Dispatch<SetStateAction<WorldStructuredData | null>>;
  onOpenDeepening: () => void;
  onOpenLayers: () => void;
  onOpenAdvanced: () => void;
}) {
  const { draftStructure, setDraftStructure, onOpenDeepening, onOpenLayers, onOpenAdvanced } = props;

  return (
    <section className="rounded-md border p-4">
      <SectionHeader
        icon={GitBranch}
        title="critical tension"
        description="Compress the world setting into issues that continue to drive the plot, and avoid the world being just background information."
      />
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <HandbookField title="world core conflict" hint="Chronic conflicts between resources, order, power systems, or faction goals.">
          <HandbookTextarea
            value={draftStructure.profile.coreConflict}
            onChange={(value) =>
              setDraftStructure((prev) => (prev ? { ...prev, profile: { ...prev.profile, coreConflict: value } } : prev))
            }
            placeholder="For example: resource depletion, order collapse, and two power systems that are mutually exclusive."
          />
        </HandbookField>
        <HandbookField title="common consequences" hint="Line by line, write out the long-term costs of the world's rules.">
          <HandbookTextarea
            value={listToText(draftStructure.rules.sharedConsequences)}
            onChange={(value) =>
              setDraftStructure((prev) =>
                prev ? { ...prev, rules: { ...prev.rules, sharedConsequences: textToList(value) } } : prev,
              )
            }
            placeholder="The stronger the strength, the closer to alienation\nThe more prosperous cities become, the more they rely on dangerous resources."
          />
        </HandbookField>
        <HandbookField title="Taboo combinations" hint="One line at a time, clarify which character backgrounds, power usages, or plot solutions cannot appear.">
          <HandbookTextarea
            value={listToText(draftStructure.rules.taboo)}
            onChange={(value) =>
              setDraftStructure((prev) => (prev ? { ...prev, rules: { ...prev.rules, taboo: textToList(value) } } : prev))
            }
            placeholder="Mortals cannot control the star core without cost\nImperial spies cannot openly join the alien camp."
          />
        </HandbookField>
        <div className="rounded-md border border-dashed p-3 text-sm leading-6 text-muted-foreground">
          When you need to fine-tune power relationships, location control rights, and import structural data, enter advanced field maintenance. Ordinary authors only need to maintain the manual content of this page.
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onOpenDeepening}>
              Q&A complete
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onOpenLayers}>
              layered draft
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onOpenAdvanced}>
              Advanced field maintenance
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
