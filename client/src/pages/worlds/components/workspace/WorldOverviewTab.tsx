import {
  BookOpen,
  Castle,
  Clock3,
  GitBranch,
  Map,
  MapPinned,
  Network,
  Pencil,
  ShieldAlert,
  Sparkles,
  WandSparkles,
  Workflow,
} from "lucide-react";
import type { WorldStructuredData, WorldVisualizationPayload } from "@ai-novel/shared/types/world";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { featureFlags } from "@/config/featureFlags";
import WorldVisualizationBoard from "../WorldVisualizationBoard";

interface WorldOverviewTabProps {
  summary?: string;
  sections: Array<{ key: string; title: string; content: string }>;
  structure?: WorldStructuredData;
  visualization?: WorldVisualizationPayload;
  onOpenStructure?: () => void;
  onOpenLayers?: () => void;
}

function compactText(value: string | null | undefined, fallback: string, limit = 120) {
  const text = value?.replace(/\s+/g, " ").trim();
  if (!text) {
    return fallback;
  }
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function listText(items: Array<string | null | undefined>, fallback: string, limit = 3) {
  const visible = items.map((item) => compactText(item, "", 96)).filter(Boolean).slice(0, limit);
  return visible.length > 0 ? visible : [fallback];
}

function HandbookBlock({
  icon: Icon,
  title,
  items,
  accent = "default",
}: {
  icon: typeof BookOpen;
  title: string;
  items: string[];
  accent?: "default" | "primary";
}) {
  return (
    <div className={accent === "primary" ? "rounded-2xl bg-primary/[0.055] p-4" : "rounded-2xl bg-muted/20 p-4"}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        {title}
      </div>
      <div className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
        {items.map((item) => (
          <div key={item} className="line-clamp-3">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyHandbookBlock({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BookOpen;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/45 bg-background/70 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        {title}
      </div>
      <div className="mt-2 text-sm leading-6 text-muted-foreground">{description}</div>
    </div>
  );
}

function WorldAssetPreviewBlock({
  icon: Icon,
  title,
  description,
  status,
}: {
  icon: typeof BookOpen;
  title: string;
  description: string;
  status: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/45 bg-background/70 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
          {title}
        </div>
        <Badge variant="secondary" className="border-0 bg-muted/60 font-normal">{status}</Badge>
      </div>
      <div className="mt-2 text-xs leading-5 text-muted-foreground">{description}</div>
    </div>
  );
}

export default function WorldOverviewTab(props: WorldOverviewTabProps) {
  const { summary, sections, structure, visualization, onOpenStructure, onOpenLayers } = props;
  const profile = structure?.profile;
  const hasHandbook = Boolean(structure);
  const worldPromise = compactText(
    profile?.identity || profile?.summary,
    summary ?? "After completing the world manual, a world sample that can be reused in novels will be formed.",
    120,
  );
  const coreRules = listText(
    structure?.rules?.axioms.map((rule) => [rule.name, rule.summary].filter(Boolean).join(": ")) ?? [],
    "Enter the manual to edit and supplement the rules that must be followed in this world.",
  );
  const majorForces = listText(
    [
      ...(structure?.forces ?? []).map((force) => [force.name, force.summary || force.currentObjective].filter(Boolean).join(": ")),
      ...(structure?.factions ?? []).map((faction) => [faction.name, faction.position || faction.doctrine].filter(Boolean).join(": ")),
    ],
    "Entering the manual to edit and supplement the forces and camps that will promote the plot.",
  );
  const storyLocations = listText(
    structure?.locations.map((location) =>
      [location.name, location.narrativeFunction || location.risk || location.summary].filter(Boolean).join(": "),
    ) ?? [],
    "Enter the manual to edit and add story locations suitable for the start, upgrades and transitions.",
  );
  const tensions = listText(
    [
      profile?.coreConflict,
      ...(structure?.relations.forceRelations ?? []).map((relation) =>
        [relation.relation, relation.tension || relation.detail].filter(Boolean).join(": "),
      ),
      ...(structure?.rules.sharedConsequences ?? []),
    ],
    "Enter the manual to edit and add world conflicts that can continue to create plot pressure.",
  );

  return (
    <section className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{featureFlags.worldVisEnabled ? "Reading the world and the map" : "Reading the World Handbook"}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Understand the world's commitments, rule boundaries, main forces, and story stages from a reader's perspective.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" className="rounded-full" onClick={onOpenStructure}>
              <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
              Editing Manual
            </Button>
            <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={onOpenLayers}>
              <WandSparkles className="mr-2 h-4 w-4" aria-hidden="true" />
              AI build
            </Button>
          </div>
        </div>
        {hasHandbook ? (
          <>
            <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
              <div className="rounded-3xl bg-muted/20 p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="border-0 bg-primary/[0.07] font-normal text-primary">world sample</Badge>
                  {profile?.tone ? <Badge variant="secondary" className="border-0 bg-muted/60 font-normal">{profile.tone}</Badge> : null}
                  {profile?.themes?.slice(0, 4).map((theme) => (
                    <Badge key={theme} variant="secondary" className="border-0 bg-muted/60 font-normal">
                      {theme}
                    </Badge>
                  ))}
                </div>
                <div className="mt-3 text-lg font-semibold leading-7">
                  {worldPromise}
                </div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">
                  {compactText(profile?.summary, summary ?? "Add a summary of the world that creators can quickly understand.", 180)}
                </div>
                <div className="mt-3 text-sm leading-6">
                  {compactText(profile?.coreConflict, "By supplementing the core conflict, the system will more easily transform the world into a constant pressure to drive the plot.", 160)}
                </div>
              </div>

              <div className="rounded-3xl border border-border/35 bg-card/70 p-5">
                <div className="text-sm font-medium">Available as world sample</div>
                <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                  <div>Character identity boundaries, power affiliation and taboo combinations.</div>
                  <div>Starting location, upgrade paths and sources of conflict.</div>
                  <div>Rules to keep following while writing.</div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-7 gap-y-2 px-1 text-sm text-muted-foreground">
              <span><strong className="font-semibold tabular-nums text-foreground">{structure?.rules.axioms.length ?? 0}</strong> core rules</span>
              <span><strong className="font-semibold tabular-nums text-foreground">{(structure?.forces.length ?? 0) + (structure?.factions.length ?? 0)}</strong> forces and camps</span>
              <span><strong className="font-semibold tabular-nums text-foreground">{structure?.locations.length ?? 0}</strong> story locations</span>
              <span><strong className="font-semibold tabular-nums text-foreground">{(structure?.relations.forceRelations.length ?? 0) + (structure?.relations.locationControls.length ?? 0)}</strong> relationship clues</span>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <HandbookBlock icon={Sparkles} title="power and rules" items={coreRules} accent="primary" />
              <HandbookBlock icon={Castle} title="main forces" items={majorForces} />
              <HandbookBlock icon={MapPinned} title="story stage" items={storyLocations} />
              <HandbookBlock icon={GitBranch} title="critical tension" items={tensions} />
            </div>

            <HandbookBlock
              icon={ShieldAlert}
              title="When using this book, please follow the"
              items={[
                compactText(structure?.rules.summary, "Core rules govern character identity, sources of conflict, and world consistency.", 150),
                ...listText(structure?.rules.taboo ?? [], "No forbidden combinations were recorded. When strong constraints are needed, they will be added in the manual revision.", 2),
              ]}
            />
          </>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1.35fr_0.85fr]">
              <div className="rounded-3xl bg-muted/20 p-5">
                <Badge variant="secondary" className="border-0 bg-primary/[0.07] font-normal text-primary">The world manual is ready to take shape</Badge>
                <div className="mt-3 text-lg font-semibold leading-7">
                  {compactText(summary, "Let the AI or manual editor organize the world skeleton first, and then use it as a reusable world sample.", 160)}
                </div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">
                  The World Manual will organize scattered settings into rules, forces, locations and plot pressures to facilitate the author's understanding and use of this book.
                </div>
              </div>

              <div className="rounded-3xl border border-border/35 bg-card/70 p-5">
                <div className="text-sm font-medium">Suggest next steps</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={onOpenLayers}>
                    <WandSparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                    AI builds the world
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={onOpenStructure}>
                    <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                    Editing Manual
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <EmptyHandbookBlock icon={Sparkles} title="power and rules" description="Record the underlying rules, costs and taboo combinations that cannot be broken casually in the world." />
              <EmptyHandbookBlock icon={Castle} title="main forces" description="Organize the organizations, factions, interest groups, and sources of pressure that will drive the plot." />
              <EmptyHandbookBlock icon={MapPinned} title="story stage" description="Mark key locations where openings, escalations, conflicts and transitions occur." />
              <EmptyHandbookBlock icon={GitBranch} title="critical tension" description="Precipitate resource conflicts, camp conflicts, and rule costs that can repeatedly create conflicts." />
            </div>

            {sections.length > 0 ? (
              <div className="rounded-3xl border border-border/35 p-4">
                <div className="mb-2 text-sm font-medium">Already have a set snippet</div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {sections.map((section) => (
                    <div key={section.key} className="rounded-2xl bg-muted/20 p-4 text-sm">
                      <div className="mb-1 font-medium">{section.title}</div>
                      <div className="line-clamp-4 whitespace-pre-wrap text-muted-foreground">{section.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
        {featureFlags.worldVisEnabled ? (
          <WorldVisualizationBoard payload={visualization} />
        ) : (
          <div className="rounded-3xl border border-border/35 p-5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Map className="h-4 w-4 text-primary" aria-hidden="true" />
                  World Asset Portal
                </div>
                <div className="mt-1 text-sm leading-6 text-muted-foreground">
                  Maps and atlases are visual assets of the World Manual and do not participate in automatic synchronization coverage, nor do they replace the source of the rules of the World Manual.
                </div>
              </div>
              <Badge variant="secondary" className="border-0 bg-muted/60 font-normal">reserved entrance</Badge>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <WorldAssetPreviewBlock
                icon={MapPinned}
                title="world map"
                description="Carrying area, location connection, story place and conflict heat."
                status={(structure?.locations.length ?? 0) > 0 ? "Organizable" : "Location to be filled"}
              />
              <WorldAssetPreviewBlock
                icon={Network}
                title="power map"
                description="Carrying power nodes, allies and enemies, control relationships and power balance."
                status={(structure?.forces.length ?? 0) + (structure?.factions.length ?? 0) > 0 ? "Organizable" : "Forces to be filled"}
              />
              <WorldAssetPreviewBlock
                icon={Clock3}
                title="world timeline"
                description="Carrying historical events, situation changes and world progress as the novel progresses."
                status={profile?.coreConflict ? "Organizable" : "Tension to be compensated"}
              />
              <WorldAssetPreviewBlock
                icon={Workflow}
                title="Power system tree"
                description="Carrying levels, resources, costs, taboos and breaking boundaries."
                status={(structure?.rules.axioms.length ?? 0) > 0 ? "Organizable" : "Rules to be added"}
              />
            </div>
          </div>
        )}
    </section>
  );
}
