import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Save } from "lucide-react";
import type { NarrativeForm } from "@ai-novel/shared/types/creationStudio";
import type { WritingPlatform, WritingPlatformGuidance, WritingPlatformProfileDefinition } from "@ai-novel/shared/types/writingPlatform";
import {
  activateWritingPlatformProfileVersion,
  getWritingPlatformProfile,
  restoreOfficialWritingPlatformProfile,
  saveWritingPlatformProfile,
} from "@/api/promptWorkbench";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const PLATFORMS: Array<{ key: WritingPlatform; label: string }> = [
  { key: "fanqie_free", label: "Georgian Serial" },
  { key: "qidian_male", label: "Progression & Adventure" },
  { key: "jinjiang_female", label: "Character & Relationship" },
  { key: "zhihu_story", label: "Georgian Short Story" },
];

const GUIDANCE_FIELDS: Array<{ key: keyof WritingPlatformGuidance; label: string }> = [
  { key: "positioning", label: "Positioning" },
  { key: "planning", label: "Planning guidance" },
  { key: "drafting", label: "Drafting guidance" },
  { key: "auditing", label: "Review guidance" },
  { key: "repairing", label: "Repair guidance" },
];

export function WritingPlatformProfileManager(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [platform, setPlatform] = useState<WritingPlatform>("fanqie_free");
  const [draft, setDraft] = useState<WritingPlatformProfileDefinition | null>(null);
  const [notes, setNotes] = useState("");
  const query = useQuery({
    queryKey: ["prompt-workbench", "writing-platform", platform],
    queryFn: () => getWritingPlatformProfile(platform),
    enabled: props.open,
  });
  const detail = query.data?.data ?? null;
  useEffect(() => { if (detail) setDraft(structuredClone(detail.profile)); }, [detail]);

  const refresh = async () => queryClient.invalidateQueries({ queryKey: ["prompt-workbench", "writing-platform", platform] });
  const saveMutation = useMutation({
    mutationFn: () => {
      if (!draft) throw new Error("The writing profile has not loaded yet.");
      return saveWritingPlatformProfile(platform, draft, notes);
    },
    onSuccess: async () => { await refresh(); setNotes(""); toast.success("The writing profile was saved as a new version."); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Save failed."),
  });
  const restoreMutation = useMutation({
    mutationFn: () => restoreOfficialWritingPlatformProfile(platform),
    onSuccess: async () => { await refresh(); toast.success("The official writing profile was restored."); },
  });
  const activateMutation = useMutation({
    mutationFn: (versionId: string) => activateWritingPlatformProfileVersion(platform, versionId),
    onSuccess: async () => { await refresh(); toast.success("The writing profile version is now active."); },
  });

  function updateGuidance(form: NarrativeForm, key: keyof WritingPlatformGuidance, value: string) {
    setDraft((current) => {
      if (!current || !current.guidance[form]) return current;
      return { ...current, guidance: { ...current.guidance, [form]: { ...current.guidance[form]!, [key]: value } } };
    });
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="flex h-[88vh] w-[min(1280px,94vw)] max-w-none flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>Writing Profiles</DialogTitle>
          <DialogDescription>The production pipeline uses the selected profile for positioning, planning, drafting, review, and repair. Existing works keep their saved snapshot.</DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 md:grid-cols-[220px_minmax(0,1fr)_260px]">
          <nav className="space-y-1 border-r bg-muted/20 p-3">
            {PLATFORMS.map((item) => (
              <button key={item.key} type="button" onClick={() => setPlatform(item.key)} className={cn("w-full rounded-lg px-3 py-2.5 text-left text-sm", item.key === platform ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:bg-background/70")}>{item.label}</button>
            ))}
          </nav>
          <main className="min-h-0 overflow-y-auto p-5">
            {!draft ? <div className="text-sm text-muted-foreground">Loading writing profile…</div> : (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm">Name<Input className="mt-2" value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} /></label>
                  <label className="text-sm">Version notes<Input className="mt-2" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Describe the intended reading improvement" /></label>
                </div>
                <label className="block text-sm">Profile summary<textarea className="mt-2 min-h-20 w-full rounded-md border bg-background p-3 text-sm" value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} /></label>
                {draft.supportedNarrativeForms.map((form) => (
                  <section key={form} className="space-y-3 rounded-xl border p-4">
                    <h3 className="font-medium">{form === "long_novel" ? "Long-form guidance" : "Short-form guidance"}</h3>
                    {GUIDANCE_FIELDS.map((field) => (
                      <label key={field.key} className="block text-sm text-muted-foreground">{field.label}
                        <textarea className="mt-1.5 min-h-24 w-full rounded-md border bg-background p-3 text-sm leading-6 text-foreground" value={draft.guidance[form]?.[field.key] ?? ""} onChange={(event) => updateGuidance(form, field.key, event.target.value)} />
                      </label>
                    ))}
                  </section>
                ))}
              </div>
            )}
          </main>
          <aside className="min-h-0 overflow-y-auto border-l bg-muted/15 p-4">
            <div className="text-sm font-medium">Current status</div>
            <div className="mt-2 text-xs leading-6 text-muted-foreground">{detail?.source === "custom" ? `Custom version ${detail.activeVersion}` : `Official version ${detail?.activeVersion ?? "-"}`}</div>
            <div className="mt-5 space-y-2">
              {(detail?.versions ?? []).map((version) => (
                <button key={version.id} type="button" onClick={() => activateMutation.mutate(version.id)} className={cn("w-full rounded-lg border p-3 text-left text-xs", version.active && "border-primary bg-primary/5")}>
                  <div className="font-medium">Version {version.versionNo}{version.active ? " · Active" : ""}</div>
                  <div className="mt-1 text-muted-foreground">{version.notes || "No version notes"}</div>
                </button>
              ))}
            </div>
          </aside>
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <Button variant="outline" onClick={() => restoreMutation.mutate()} disabled={restoreMutation.isPending}><RotateCcw className="mr-2 h-4 w-4" />Restore official profile</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!draft || saveMutation.isPending}><Save className="mr-2 h-4 w-4" />Save new version</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
