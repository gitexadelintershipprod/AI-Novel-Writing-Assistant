import { useMemo, useState } from "react";
import type { AntiAiRule, StyleProfile, StyleTemplate } from "@ai-novel/shared/types/styleEngine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStyleProfileOriginLabel, isStarterStyleProfile } from "../writingFormulaV2.shared";
import WritingFormulaRulesPanel from "./WritingFormulaRulesPanel";

export interface WritingFormulaCreateFormState {
  manualName: string;
  briefName: string;
  briefCategory: string;
  briefPrompt: string;
  extractName: string;
  extractCategory: string;
  extractSourceText: string;
}

interface WritingFormulaSidebarProps {
  createForm: WritingFormulaCreateFormState;
  onCreateFormChange: (patch: Partial<WritingFormulaCreateFormState>) => void;
  onCreateManual: () => void;
  onCreateFromBrief: () => void;
  onExtractFromText: () => void;
  onCreateFromTemplate: (templateId: string) => void;
  createManualPending: boolean;
  createFromBriefPending: boolean;
  extractFromTextPending: boolean;
  createFromTemplatePending: boolean;
  templates: StyleTemplate[];
  antiAiRules: AntiAiRule[];
  profiles: StyleProfile[];
  selectedProfileId: string;
  onSelectProfile: (profileId: string) => void;
  onToggleRule: (rule: AntiAiRule, enabled: boolean) => void;
}

export default function WritingFormulaSidebar(props: WritingFormulaSidebarProps) {
  const {
    createForm,
    onCreateFormChange,
    onCreateManual,
    onCreateFromBrief,
    onExtractFromText,
    onCreateFromTemplate,
    createManualPending,
    createFromBriefPending,
    extractFromTextPending,
    createFromTemplatePending,
    templates,
    antiAiRules,
    profiles,
    selectedProfileId,
    onSelectProfile,
    onToggleRule,
  } = props;
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeCreateTab, setActiveCreateTab] = useState("quick_start");

  const { starterProfiles, customProfiles } = useMemo(() => {
    const starters = profiles.filter((profile) => isStarterStyleProfile(profile));
    const custom = profiles.filter((profile) => !isStarterStyleProfile(profile));
    return {
      starterProfiles: starters,
      customProfiles: custom,
    };
  }, [profiles]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto xl:pr-1">
      <Card>
        <CardHeader>
          <CardTitle>Choose a writing method first and then fine-tune it</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm leading-6 text-muted-foreground">
            When using it for the first time, there is no need to understand all the rule fields first. First, choose a set of preset writing methods that best resembles what you want to write, and then go in and change the name, tags, and rules. It will be much smoother.
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-xs font-medium text-muted-foreground">Directly editable writing assets</div>
              <div className="mt-1 text-2xl font-semibold text-foreground">{profiles.length}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                which preset {starterProfiles.length} Set, suitable for directly copying ideas and then changing them.
              </div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-xs font-medium text-muted-foreground">Built-in templates</div>
              <div className="mt-1 text-2xl font-semibold text-foreground">{templates.length}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Suitable for quickly creating a new writing style without starting from a blank slate.
              </div>
            </div>
          </div>
          <Button className="w-full" onClick={() => setCreateDialogOpen(true)}>
            Create new or import writing method
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Switch current writing method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-xs leading-6 text-muted-foreground">
            This is responsible for switching the editing object in the pop-up window. See the complete asset list on the home page.
          </div>

          {customProfiles.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">The way you created it</div>
              {customProfiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    profile.id === selectedProfileId ? "border-primary bg-primary/5" : "hover:border-primary/40"
                  }`}
                  onClick={() => onSelectProfile(profile.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{profile.name}</div>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {getStyleProfileOriginLabel(profile)}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {starterProfiles.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preset starting writing method</div>
              {starterProfiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    profile.id === selectedProfileId ? "border-primary bg-primary/5" : "hover:border-primary/40"
                  }`}
                  onClick={() => onSelectProfile(profile.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{profile.name}</div>
                    </div>
                    <Badge variant="outline" className="shrink-0">Preset</Badge>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {profiles.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              There are currently no writing assets. Click "New or Import Writing Method" above to quickly start with a template, which is the most worry-free.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <WritingFormulaRulesPanel antiAiRules={antiAiRules} onToggleRule={onToggleRule} />

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Create new or import writing method</DialogTitle>
            <DialogDescription>
              It is recommended to start sentence generation in "Quick Start" or "Blank/AI". When you have stable sample text in hand, use "Extract from text".
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeCreateTab} onValueChange={setActiveCreateTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="quick_start">quick start</TabsTrigger>
              <TabsTrigger value="blank">Blank/AI</TabsTrigger>
              <TabsTrigger value="extract">Extract from text</TabsTrigger>
            </TabsList>

            <TabsContent value="quick_start" className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                On the left are several sets of starting writing methods that can be directly modified. When you want to create a new set, it will be more labor-saving to quickly generate it from a template, and then fine-tune it according to the project.
              </div>
              <div className="grid max-h-[58vh] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
                {templates.map((template) => (
                  <div key={template.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-foreground">{template.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{template.category}</div>
                      </div>
                      <Badge variant="outline">Template</Badge>
                    </div>
                    <div className="mt-3 text-sm leading-6 text-muted-foreground">{template.description}</div>
                    {template.tags.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {template.tags.slice(0, 4).map((tag) => (
                          <Badge key={`${template.id}-${tag}`} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    ) : null}
                    {template.applicableGenres.length > 0 ? (
                      <div className="mt-3 text-xs text-muted-foreground">
                        Best for: {template.applicableGenres.join(" / ")}
                      </div>
                    ) : null}
                    <Button
                      size="sm"
                      className="mt-4 w-full"
                      onClick={() => onCreateFromTemplate(template.id)}
                      disabled={createFromTemplatePending}
                    >
                      {createFromTemplatePending ? "Creating..." : "Based on this set of quick new"}
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="blank" className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                There are two lightweight ways to get started: if you know you want to maintain a set of rules, create blank spaces manually; if you only know "how you want to write it," just write a sentence and let AI build the skeleton.
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <div className="mb-3">
                    <div className="text-sm font-medium text-foreground">Manual blank creation</div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">
                      It is suitable for you who know what style rules you want to maintain and just want to build an empty shell first and then slowly fill it up.
                    </div>
                  </div>
                  <div className="space-y-3">
                    <input
                      className="w-full rounded-md border p-2 text-sm"
                      placeholder="For example: my female channel urban relationship writing method"
                      value={createForm.manualName}
                      onChange={(event) => onCreateFormChange({ manualName: event.target.value })}
                    />
                    <Button
                      className="w-full"
                      onClick={onCreateManual}
                      disabled={!createForm.manualName.trim() || createManualPending}
                    >
                      {createManualPending ? "Creating..." : "Create blank writing"}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="mb-3">
                    <div className="text-sm font-medium text-foreground">AI helps me build a set first</div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">
                      When you don’t want to study the rule fields first, directly describe the reading feel, temperament or reference direction you want, and AI will first generate a set of editable writing methods.
                    </div>
                  </div>
                  <div className="space-y-3">
                    <input
                      className="w-full rounded-md border p-2 text-sm"
                      placeholder="Writing method name (optional, leave it blank and let AI pick it up)"
                      value={createForm.briefName}
                      onChange={(event) => onCreateFormChange({ briefName: event.target.value })}
                    />
                    <input
                      className="w-full rounded-md border p-2 text-sm"
                      placeholder="Classification (optional)"
                      value={createForm.briefCategory}
                      onChange={(event) => onCreateFormChange({ briefCategory: event.target.value })}
                    />
                    <textarea
                      className="min-h-[180px] w-full rounded-md border p-2 text-sm"
                      placeholder='For example: similar to the writing method of "The Distant Messiah", the overall restraint, strong sense of thinking, sharp dialogue, less chicken soup, more realistic friction.'
                      value={createForm.briefPrompt}
                      onChange={(event) => onCreateFormChange({ briefPrompt: event.target.value })}
                    />
                    <Button
                      className="w-full"
                      onClick={onCreateFromBrief}
                      disabled={!createForm.briefPrompt.trim() || createFromBriefPending}
                    >
                      {createFromBriefPending ? "AI generating..." : "AI generates a set of writing methods"}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="extract" className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                It is suitable for you who have a stable reference text in your hand and want the system to extract features first and then enter editing. When there are no ready-made samples, it is recommended to start with templates or AI.
              </div>
              <div className="rounded-lg border p-4">
                <div className="space-y-3">
                  <input
                    className="w-full rounded-md border p-2 text-sm"
                    placeholder="Written name"
                    value={createForm.extractName}
                    onChange={(event) => onCreateFormChange({ extractName: event.target.value })}
                  />
                  <input
                    className="w-full rounded-md border p-2 text-sm"
                    placeholder="Classification (optional)"
                    value={createForm.extractCategory}
                    onChange={(event) => onCreateFormChange({ extractCategory: event.target.value })}
                  />
                  <textarea
                    className="min-h-[220px] w-full rounded-md border p-2 text-sm"
                    placeholder="Paste reference text"
                    value={createForm.extractSourceText}
                    onChange={(event) => onCreateFormChange({ extractSourceText: event.target.value })}
                  />
                  <Button
                    className="w-full"
                    onClick={onExtractFromText}
                    disabled={!createForm.extractName.trim() || !createForm.extractSourceText.trim() || extractFromTextPending}
                  >
                    {extractFromTextPending ? "Extracting..." : "AI extracts features and creates"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
