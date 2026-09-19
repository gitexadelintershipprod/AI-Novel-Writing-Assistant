import { useEffect, useState } from "react";
import { AlertTriangle, BookOpen, Castle, GitBranch, MapPinned, Pencil, Save, ScrollText, WandSparkles } from "lucide-react";
import type {
  WorldBindingSupport,
  WorldStructuredData,
  WorldStructureSectionKey,
} from "@ai-novel/shared/types/world";
import type { WorldStructurePayload } from "@/api/world";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HandbookField,
  HandbookPreviewCard,
  HandbookPreviewLine,
  HandbookTextarea,
} from "./handbook/HandbookPrimitives";
import WorldHandbookForceSection from "./handbook/WorldHandbookForceSection";
import WorldHandbookLocationSection from "./handbook/WorldHandbookLocationSection";
import WorldHandbookRuleSection from "./handbook/WorldHandbookRuleSection";
import WorldHandbookTensionSection from "./handbook/WorldHandbookTensionSection";

type EditableHandbookSection = "profile" | "rules" | "forces" | "locations" | "relations";

function compactText(value: string | null | undefined, fallback: string, limit = 120): string {
  const text = value?.replace(/\s+/g, " ").trim();
  if (!text) {
    return fallback;
  }
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function joinPreview(items: Array<string | null | undefined>, fallback: string): string {
  const text = items
    .map((item) => item?.replace(/\s+/g, " ").trim())
    .filter((item): item is string => Boolean(item))
    .slice(0, 3)
    .join(" / ");
  return text || fallback;
}

export default function WorldHandbookEditor(props: {
  initialPayload?: WorldStructurePayload;
  savePending: boolean;
  backfillPending: boolean;
  generatePending: boolean;
  onSave: (structure: WorldStructuredData, bindingSupport: WorldBindingSupport) => Promise<void>;
  onBackfill: () => Promise<{ structure: WorldStructuredData; bindingSupport: WorldBindingSupport } | undefined>;
  onGenerate: (
    section: WorldStructureSectionKey,
    structure: WorldStructuredData,
    bindingSupport: WorldBindingSupport,
  ) => Promise<{ structure: WorldStructuredData; bindingSupport: WorldBindingSupport } | undefined>;
  onOpenDeepening: () => void;
  onOpenLayers: () => void;
  onOpenOverview: () => void;
  onOpenAdvanced: () => void;
}) {
  const {
    initialPayload,
    savePending,
    backfillPending,
    generatePending,
    onSave,
    onBackfill,
    onGenerate,
    onOpenDeepening,
    onOpenLayers,
    onOpenOverview,
    onOpenAdvanced,
  } = props;
  const [draftStructure, setDraftStructure] = useState<WorldStructuredData | null>(initialPayload?.structure ?? null);
  const [draftBindingSupport, setDraftBindingSupport] = useState<WorldBindingSupport | null>(
    initialPayload?.bindingSupport ?? null,
  );
  const [activeAiSection, setActiveAiSection] = useState<WorldStructureSectionKey>("profile");
  const [editingSection, setEditingSection] = useState<EditableHandbookSection | null>(null);

  useEffect(() => {
    if (!initialPayload) {
      return;
    }
    setDraftStructure(initialPayload.structure);
    setDraftBindingSupport(initialPayload.bindingSupport);
  }, [initialPayload]);

  if (!draftStructure || !draftBindingSupport) {
    return (
      <section className="flex min-h-56 flex-col items-center justify-center rounded-3xl bg-muted/20 px-6 text-center">
          <BookOpen className="h-6 w-6 text-muted-foreground/60" aria-hidden="true" />
          <div className="mt-3 font-medium">Reading the world manual</div>
          <div className="mt-1 text-sm leading-6 text-muted-foreground">If necessary, you can let AI organize the existing settings into a complete manual.</div>
          <Button
            className="mt-4 rounded-full"
            variant="outline"
            onClick={async () => {
              const result = await onBackfill();
              if (result) {
                setDraftStructure(result.structure);
                setDraftBindingSupport(result.bindingSupport);
              }
            }}
            disabled={backfillPending}
          >
            {backfillPending ? "Organizing..." : "Let AI sort out the world manual"}
          </Button>
      </section>
    );
  }

  const saveDraft = async () => {
    await onSave(draftStructure, draftBindingSupport);
  };

  const generateSection = async () => {
    const result = await onGenerate(activeAiSection, draftStructure, draftBindingSupport);
    if (result) {
      setDraftStructure(result.structure);
      setDraftBindingSupport(result.bindingSupport);
    }
  };

  return (
    <section className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Organizing the World Handbook</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              First confirm the impression and core contradictions of the world on readers, and then organize the rules, forces, locations and conflict tensions as needed.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={onOpenOverview}>
              <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />
              View manual
            </Button>
            <Button type="button" size="sm" className="rounded-full" onClick={saveDraft} disabled={savePending}>
              <Save className="mr-2 h-4 w-4" aria-hidden="true" />
              {savePending ? "Saving..." : "save manual"}
            </Button>
          </div>
        </div>
        <div className="rounded-3xl bg-muted/20 p-5 sm:p-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="border-0 bg-primary/[0.07] font-normal text-primary">world impression</Badge>
            {draftStructure.profile.tone ? <Badge variant="secondary" className="border-0 bg-muted/60 font-normal">{draftStructure.profile.tone}</Badge> : null}
            {draftStructure.profile.themes.slice(0, 4).map((theme) => (
              <Badge key={theme} variant="secondary" className="border-0 bg-muted/60 font-normal">
                {theme}
              </Badge>
            ))}
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[0.75fr_1.25fr]">
            <HandbookPreviewLine
              label="Impression of the world in one sentence"
              value={draftStructure.profile.identity}
              fallback="Add a sentence of world impression to let the author know the subject matter, sense of the times and core wonders at a glance."
            />
            <HandbookPreviewLine
              label="Reader's first glance"
              value={draftStructure.profile.summary}
              fallback="Complement the first glimpse, order, danger, or wonder of the world."
            />
            <HandbookPreviewLine
              label="reading temperament"
              value={draftStructure.profile.tone || draftStructure.profile.themes.join("、")}
              fallback="Supplement reading temperament, such as passionate upgrades, dark epics, light-hearted adventures, or power struggles."
            />
            <HandbookPreviewLine
              label="Conflicts that continue to drive the plot"
              value={draftStructure.profile.coreConflict}
              fallback="Added an issue that repeatedly creates character selection, conflict of factions, and chapter events."
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setEditingSection("profile")}>
              <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
              Organize the world summary
            </Button>
          </div>
          {editingSection === "profile" ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-[0.8fr_1.4fr]">
            <div className="space-y-3">
              <HandbookField title="Impression of the world in one sentence" hint="Let the author and AI know the world's genre, era, and core wonders at a glance.">
                <Input
                  value={draftStructure.profile.identity}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev ? { ...prev, profile: { ...prev.profile, identity: event.target.value } } : prev,
                    )
                  }
                  placeholder="For example: The Xianxia Dynasty with depleted star cores"
                />
              </HandbookField>
              <HandbookField title="reading temperament" hint="Decide whether the story will be dark, passionate, lighthearted, Machiavellian, or adventurous.">
                <Input
                  value={draftStructure.profile.tone}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev ? { ...prev, profile: { ...prev.profile, tone: event.target.value } } : prev,
                    )
                  }
                  placeholder="Dark epic, light adventure, power struggle..."
                />
              </HandbookField>
              <HandbookField title="Topic keywords" hint="Separate them with periods to help keep the same thematic direction for subsequent characters, locations, and conflicts.">
                <Input
                  value={draftStructure.profile.themes.join("、")}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev
                        ? {
                          ...prev,
                          profile: {
                            ...prev.profile,
                            themes: event.target.value.split(/[、,，]/).map((item) => item.trim()).filter(Boolean),
                          },
                        }
                        : prev,
                    )
                  }
                  placeholder="Revenge, dynasty change, power awakening"
                />
              </HandbookField>
            </div>
            <div className="space-y-3">
              <HandbookField title="The world gives readers the first glimpse" hint="Write short paragraphs that the author can directly retell. There is no need to break it into geographical, cultural, and historical fields.">
                <HandbookTextarea
                  value={draftStructure.profile.summary}
                  onChange={(value) =>
                    setDraftStructure((prev) => (prev ? { ...prev, profile: { ...prev.profile, summary: value } } : prev))
                  }
                  placeholder="Use a paragraph to let the author know what the world looks like and where the story will begin."
                />
              </HandbookField>
              <HandbookField title="Conflicts that can continue to drive the plot" hint="This is not a background introduction, but a recurring question around character actions, power conflicts, and chapter events.">
                <HandbookTextarea
                  value={draftStructure.profile.coreConflict}
                  onChange={(value) =>
                    setDraftStructure((prev) =>
                      prev ? { ...prev, profile: { ...prev.profile, coreConflict: value } } : prev,
                    )
                  }
                  placeholder="For example: the depletion of the star core makes practitioners compete for life span, the court wants to seal the truth, and alien monsters from the border take the opportunity to invade."
                  minRows={3}
                />
              </HandbookField>
            </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border/35 bg-card/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">AI-assisted organizing</div>
              <div className="mt-1 text-sm leading-6 text-muted-foreground">
                Let the AI complete a manual block based on existing content; you can continue to rewrite and then save.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "profile", label: "world summary" },
                { key: "rules", label: "Rule" },
                { key: "factions", label: "power" },
                { key: "locations", label: "location" },
                { key: "relations", label: "Tension" },
              ].map((item) => (
                <Button
                  key={item.key}
                  type="button"
                  size="sm"
                  variant={activeAiSection === item.key ? "default" : "ghost"}
                  className="rounded-full"
                  onClick={() => setActiveAiSection(item.key as WorldStructureSectionKey)}
                >
                  {item.label}
                </Button>
              ))}
              <Button type="button" size="sm" variant="secondary" className="rounded-full" onClick={generateSection} disabled={generatePending}>
                <WandSparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                {generatePending ? "Completing..." : "Complete the selected block"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <HandbookPreviewCard
            icon={ScrollText}
            title="core rules"
            description={`${draftStructure.rules.axioms.length} Rules limit power, resources, taboos, and costs.`}
            action={
              <Button type="button" size="sm" variant="outline" onClick={() => setEditingSection("rules")}>
                Organize rules
              </Button>
            }
          >
            <div className="space-y-3">
              <HandbookPreviewLine
                label="General rules"
                value={draftStructure.rules.summary}
                fallback="Supplement the hard rules for how the world works to prevent character abilities and plot solutions from getting out of control."
              />
              <HandbookPreviewLine
                label="representative rule"
                value={joinPreview(
                  draftStructure.rules.axioms.map((rule) => [rule.name, rule.summary].filter(Boolean).join(": ")),
                  "Add 2-3 additional core rules that must be followed.",
                )}
                fallback="Add 2-3 additional core rules that must be followed."
              />
            </div>
          </HandbookPreviewCard>

          <HandbookPreviewCard
            icon={Castle}
            title="main forces"
            description={`${draftStructure.forces.length} factions determine character allegiances, faction pressure, and resource competition.`}
            action={
              <Button type="button" size="sm" variant="outline" onClick={() => setEditingSection("forces")}>
                Organize forces
              </Button>
            }
          >
            <div className="space-y-3">
              <HandbookPreviewLine
                label="Active forces"
                value={joinPreview(
                  draftStructure.forces.map((force) => [force.name, force.currentObjective].filter(Boolean).join(": ")),
                  "After the main forces are supplemented, character identities and camp conflicts will become clearer.",
                )}
                fallback="After the main forces are supplemented, character identities and camp conflicts will become clearer."
              />
              <HandbookPreviewLine
                label="story pressure"
                value={joinPreview(
                  draftStructure.forces.map((force) => force.pressure),
                  "The pressure that supplementary forces put on the protagonist and the world order.",
                )}
                fallback="The pressure that supplementary forces put on the protagonist and the world order."
              />
            </div>
          </HandbookPreviewCard>

          <HandbookPreviewCard
            icon={MapPinned}
            title="story stage"
            description={`${draftStructure.locations.length} locations carry the opening, escalation, turning point, final showdown, and map assets.`}
            action={
              <Button type="button" size="sm" variant="outline" onClick={() => setEditingSection("locations")}>
                Organize the place
              </Button>
            }
          >
            <div className="space-y-3">
              <HandbookPreviewLine
                label="Available locations"
                value={joinPreview(
                  draftStructure.locations.map((location) =>
                    [location.name, location.narrativeFunction || location.terrain].filter(Boolean).join(": "),
                  ),
                  "Supplementary starting location, trial location, conflict location or truth location.",
                )}
                fallback="Supplementary starting location, trial location, conflict location or truth location."
              />
              <HandbookPreviewLine
                label="entry risk"
                value={joinPreview(
                  draftStructure.locations.map((location) => location.risk),
                  "Supplement the resistance, costs, or identity risks associated with entering a location.",
                )}
                fallback="Supplement the resistance, costs, or identity risks associated with entering a location."
              />
            </div>
          </HandbookPreviewCard>

          <HandbookPreviewCard
            icon={GitBranch}
            title="conflict tension"
            description="Documenting power relations, location controls, shared consequences, and taboo combinations helps the world remain writable."
            action={
              <Button type="button" size="sm" variant="outline" onClick={() => setEditingSection("relations")}>
                finishing tension
              </Button>
            }
          >
            <div className="space-y-3">
              <HandbookPreviewLine
                label="power relations"
                value={joinPreview(
                  draftStructure.relations.forceRelations.map((relation) =>
                    [relation.relation, relation.tension || relation.detail].filter(Boolean).join(": "),
                  ),
                  "Complementing who is allied with, hostile to, competing with, or exploiting whom.",
                )}
                fallback="Complementing who is allied with, hostile to, competing with, or exploiting whom."
              />
              <HandbookPreviewLine
                label="common consequences"
                value={joinPreview(
                  draftStructure.rules.sharedConsequences,
                  "Supplement the consequences of breaking rules or escalating conflicts that will affect the overall situation.",
                )}
                fallback="Supplement the consequences of breaking rules or escalating conflicts that will affect the overall situation."
              />
            </div>
          </HandbookPreviewCard>
        </div>

        {editingSection ? (
          <div className="rounded-2xl bg-primary/[0.055] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 text-primary" aria-hidden="true" />
                The selected blocks are being sorted, and the manual overview above will be updated after saving.
              </div>
              <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setEditingSection(null)}>
                CollapseEdit
              </Button>
            </div>
          </div>
        ) : null}

        {editingSection === "rules" ? (
          <WorldHandbookRuleSection draftStructure={draftStructure} setDraftStructure={setDraftStructure} />
        ) : null}
        {editingSection === "forces" ? (
          <WorldHandbookForceSection draftStructure={draftStructure} setDraftStructure={setDraftStructure} />
        ) : null}
        {editingSection === "locations" ? (
          <WorldHandbookLocationSection draftStructure={draftStructure} setDraftStructure={setDraftStructure} />
        ) : null}
        {editingSection === "relations" ? (
          <WorldHandbookTensionSection
            draftStructure={draftStructure}
            setDraftStructure={setDraftStructure}
            onOpenDeepening={onOpenDeepening}
            onOpenLayers={onOpenLayers}
            onOpenAdvanced={onOpenAdvanced}
          />
        ) : null}
    </section>
  );
}
