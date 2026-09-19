import type { KeyboardEvent, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { LandingProfileItem } from "../writingFormulaLandingItems";

interface WritingFormulaLandingProps {
  onOpenCreate: () => void;
  onSelectProfile: (profileId: string) => void;
  onEditProfile: (profileId: string) => void;
  onOpenWorkbench: (profileId: string) => void;
  onUseProfileForClean: (profileId: string) => void;
  onDeleteProfile: (profileId: string) => void;
  onOpenPromptLab: () => void;
  deletePending: boolean;
  profileItems: LandingProfileItem[];
  selectedProfileId: string;
}

function truncateText(value: string | null | undefined, maxLength: number): string {
  const text = value?.trim() ?? "";
  if (!text) {
    return "";
  }
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function handleSelectableKeyDown(event: KeyboardEvent<HTMLDivElement>, onSelect: () => void): void {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }
  event.preventDefault();
  onSelect();
}

function DetailPanel(props: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-2xl border bg-card/80 p-4 shadow-sm">
      <div className="space-y-1">
        <div className="text-xs font-semibold tracking-[0.12em] text-muted-foreground">{props.title}</div>
        {props.description ? (
          <div className="text-xs leading-6 text-muted-foreground">{props.description}</div>
        ) : null}
      </div>
      {props.children}
    </div>
  );
}

function DetailStatRow(props: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm leading-6">
      <div className="text-muted-foreground">{props.label}</div>
      <div className="text-right text-foreground">{props.value}</div>
    </div>
  );
}

function SummaryCard(props: { title: string; summary: string }) {
  return (
    <div className="rounded-2xl border bg-muted/25 p-3.5">
      <div className="text-sm font-medium text-foreground">{props.title}</div>
      <div className="mt-2 text-sm leading-6 text-muted-foreground">{props.summary}</div>
    </div>
  );
}

export default function WritingFormulaLanding(props: WritingFormulaLandingProps) {
  const {
    onOpenCreate,
    onSelectProfile,
    onEditProfile,
    onOpenWorkbench,
    onUseProfileForClean,
    onDeleteProfile,
    onOpenPromptLab,
    deletePending,
    profileItems,
    selectedProfileId,
  } = props;

  const customProfiles = profileItems.filter((item) => !item.isStarter);
  const starterProfiles = profileItems.filter((item) => item.isStarter);

  const renderProfileCard = (profile: LandingProfileItem) => {
    const isSelected = profile.id === selectedProfileId;
    const selectedStyle = "border-primary/60 bg-primary/[0.045] shadow-sm";
    const idleStyle = "border-border bg-card hover:border-primary/35 hover:bg-muted/25";
    const badgeClassName = profile.isStarter
      ? "h-6 border-sky-200 bg-white text-sky-700"
      : "h-6";

    return (
      <div
        key={profile.id}
        role="button"
        tabIndex={0}
        onClick={() => onSelectProfile(profile.id)}
        onKeyDown={(event) => handleSelectableKeyDown(event, () => onSelectProfile(profile.id))}
        className={`rounded-3xl border px-5 py-4 text-left transition duration-200 ${isSelected ? selectedStyle : idleStyle}`}
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-base font-semibold text-foreground">{profile.name}</div>
              <Badge variant={profile.isStarter ? "outline" : (isSelected ? "default" : "secondary")} className={badgeClassName}>
                {profile.originLabel}
              </Badge>
              {profile.category ? (
                <Badge variant="outline" className="h-6">
                  {profile.category}
                </Badge>
              ) : null}
              <Badge variant="outline" className="h-6">
                {profile.sourceTypeLabel}
              </Badge>
            </div>
            <div className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {truncateText(profile.summaryLine, 120) || "There is no written summary yet."}
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.tags.slice(0, 4).map((tag) => (
                <Badge key={`${profile.id}-${tag}`} variant="outline" className="h-6">
                  {tag}
                </Badge>
              ))}
              {profile.recentNovelTitle ? (
              <Badge variant="secondary" className="h-6">
                  Recently bound:{profile.recentNovelTitle}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(event) => {
                event.stopPropagation();
                onEditProfile(profile.id);
              }}
            >
              Edit settings
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(event) => {
                event.stopPropagation();
                onOpenWorkbench(profile.id);
              }}
            >
              Application and testing
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={(event) => {
                event.stopPropagation();
                onUseProfileForClean(profile.id);
              }}
            >
              Get rid of AI flavor
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={deletePending}
              onClick={(event) => {
                event.stopPropagation();
                onDeleteProfile(profile.id);
              }}
            >
              {deletePending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>

        {isSelected ? (
          <div className="mt-5 space-y-4 rounded-2xl border bg-muted/25 p-4 md:p-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_280px]">
              <DetailPanel
                title="Reading sense and positioning"
                description="This column helps you quickly judge what kind of writing style you want to write, and what type of project is suitable for it first."
              >
                <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 text-sm leading-7 text-slate-700">
                  {profile.description}
                </div>
                {profile.detailLines.length > 0 ? (
                  <div className="grid gap-2">
                    {profile.detailLines.map((line) => (
                      <div key={`${profile.id}-${line}`} className="rounded-xl border border-slate-200/80 bg-white/75 px-3 py-3 text-sm leading-6 text-slate-700">
                        {line}
                      </div>
                    ))}
                  </div>
                ) : null}
                {profile.sourceContentPreview ? (
                  <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,rgba(241,245,249,0.9),rgba(255,255,255,0.98))] px-4 py-4 text-sm leading-7 text-slate-700">
                    <div className="mb-2 text-xs font-semibold tracking-[0.12em] text-slate-500">Original sample snippet</div>
                    <div>{profile.sourceContentPreview}</div>
                  </div>
                ) : null}
              </DetailPanel>

              <div className="space-y-4">
                <DetailPanel
                  title="Summary of rules"
                  description="Here are the four-level rules that really control the sense of reading in this writing method, so that you can understand them first in the list."
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <SummaryCard title="plot advancement" summary={profile.narrativeSummary} />
                    <SummaryCard title="Character expression" summary={profile.characterSummary} />
                    <SummaryCard title="language texture" summary={profile.languageSummary} />
                    <SummaryCard title="rhythm control" summary={profile.rhythmSummary} />
                  </div>
                </DetailPanel>

                <DetailPanel
                  title="Anti-AI constraints"
                  description="This part determines which risks the system will prioritize when detecting and correcting manuscripts."
                >
                  {profile.antiAiFocus.length > 0 || profile.antiAiRuleNames.length > 0 || profile.extractionAntiAiRecommendationCount > 0 ? (
                    <div className="space-y-3">
                      {profile.antiAiFocus.length > 0 ? (
                        <div className="grid gap-2">
                          {profile.antiAiFocus.map((line) => (
                            <div key={`${profile.id}-${line}`} className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-3 text-sm leading-6 text-amber-900">
                              {line}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {profile.antiAiRuleNames.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {profile.antiAiRuleNames.map((ruleName) => (
                            <Badge key={`${profile.id}-${ruleName}`} variant="secondary" className="bg-slate-100 text-slate-700">
                              {ruleName}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                      {profile.extractionAntiAiRecommendationCount > 0 ? (
                        <div className="rounded-xl border bg-slate-50/80 px-3 py-3 text-sm leading-6 text-slate-600">
                          This writing method is additionally recommended during the extraction stage. {profile.extractionAntiAiRecommendationCount} It violates AI rules and is suitable for further refinement.
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed px-3 py-3 text-sm leading-6 text-slate-500">
                      This writing method has not been bound to clear anti-AI constraints, so the readability will be weak when "removing the AI flavor".
                    </div>
                  )}
                </DetailPanel>
              </div>

              <div className="space-y-4">
                <DetailPanel
                  title="Asset overview"
                  description="This column mainly helps you judge how mature this writing method is now."
                >
                  <div className="space-y-2">
                    <DetailStatRow label="Source" value={profile.sourceTypeLabel} />
                    <DetailStatRow label="Latest updates" value={profile.updatedAtLabel} />
                    <DetailStatRow label="enable features" value={`${profile.extractedFeatureCount} items`} />
                    <DetailStatRow label="high risk fingerprints" value={`${profile.highRiskFeatureCount} items`} />
                    <DetailStatRow
                      label="Current default"
                      value={profile.selectedPresetLabel || "Unlocked"}
                    />
                    <DetailStatRow
                      label="Optional presets"
                      value={profile.presetLabels.length > 0 ? profile.presetLabels.join(" / ") : "None yet"}
                    />
                    <DetailStatRow label="Target bound" value={`${profile.bindingCount}`} />
                    <DetailStatRow
                      label="recent novels"
                      value={profile.recentNovelTitle || "Not yet bound to a novel"}
                    />
                    <DetailStatRow
                      label="Applicable themes"
                      value={profile.applicableGenres.length > 0 ? profile.applicableGenres.join(" / ") : "Not filled in"}
                    />
                  </div>
                </DetailPanel>

                <DetailPanel
                  title="Next step"
                  description="The three buttons are now each responsible for one thing and will no longer jump to the same piece of content."
                >
                  <div className="space-y-2 text-sm leading-6 text-slate-700">
                    <div>Editorial Settings: Maintain instructions, rules, and anti-AI constraints for the writing style itself.</div>
                    <div>Application and testing: Bind it to a novel or chapter, and do a trial writing verification.</div>
                    <div>Remove the AI flavor: only process text detection and correction, without rewriting method fields.</div>
                  </div>
                </DetailPanel>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/10 bg-card shadow-sm">
        <CardContent className="space-y-6 p-5 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                My writing assets
              </Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  First choose a writing method, and then decide whether to edit, apply or remove the AI flavor.
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                  The home page is responsible for seeing your existing writing assets. After expansion, the reading positioning, rule summary, anti-AI constraints and current maturity of this writing method will be directly displayed.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={onOpenPromptLab}>
                Text Effects Laboratory
              </Button>
              <Button type="button" onClick={onOpenCreate}>
                Create a new writing style
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-primary/15 bg-primary/[0.045] px-4 py-3 text-sm leading-7 text-muted-foreground">
            Please enter the book-level default writing method from the basic information of the novel, and let the novel select the writing method assets to be used, and then bring them into the subsequent director and text process.
          </div>

          {profileItems.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-muted/20 p-6">
              <div className="text-lg font-semibold text-foreground">There are currently no writing assets</div>
              <div className="mt-2 text-sm leading-7 text-muted-foreground">
                Create the first set of writing methods first, and then come back later to slowly add rules, test writing, and bind goals.
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={onOpenCreate}>
                  To create the first set of writing methods
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {customProfiles.length > 0 ? (
                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">Your own writing style</div>
                      <div className="text-xs leading-6 text-slate-500">
                        These are the reusable assets you have accumulated and should be picked here first.
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                      {customProfiles.length} sets
                    </Badge>
                  </div>
                  <div className="grid gap-3">
                    {customProfiles.map(renderProfileCard)}
                  </div>
                </section>
              ) : null}

              {starterProfiles.length > 0 ? (
                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">A starting writing method that can be changed directly</div>
                      <div className="text-xs leading-6 text-slate-500">
                        These preset assets are suitable for borrowing a set of skeletons first, and then changing them into your own writing style according to the current project.
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                      {starterProfiles.length} sets
                    </Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {starterProfiles.map(renderProfileCard)}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
