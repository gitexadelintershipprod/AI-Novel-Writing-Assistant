import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import type { NovelStoryMode, StoryModeProfile } from "@ai-novel/shared/types/storyMode";
import {
  createStoryModeChildren,
  createStoryModeTree,
  deleteStoryMode,
  flattenStoryModeTreeOptions,
  generateStoryModeChild,
  generateStoryModeExpansion,
  generateStoryModeTree,
  getStoryModeTree,
  updateStoryMode,
  type StoryModeTreeDraft,
  type StoryModeTreeNode,
} from "@/api/storyMode";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { useLLMStore } from "@/store/llmStore";
import StoryModeProfileFields from "./components/StoryModeProfileFields";
import StoryModeTreeBrowser from "./components/StoryModeTreeBrowser";
import SelectControl from "@/components/common/SelectControl";
import StoryModeCreateDialog from "./components/StoryModeCreateDialog";
import StoryModeExpansionDialog from "./components/StoryModeExpansionDialog";

type StoryModeProfileDraft = StoryModeProfile;

interface StoryModeDialogState {
  name: string;
  description: string;
  template: string;
  profile: StoryModeProfileDraft;
}

function createEmptyProfile(): StoryModeProfileDraft {
  return {
    coreDrive: "",
    readerReward: "",
    progressionUnits: [],
    allowedConflictForms: [],
    forbiddenConflictForms: [],
    conflictCeiling: "medium",
    resolutionStyle: "",
    chapterUnit: "",
    volumeReward: "",
    mandatorySignals: [],
    antiSignals: [],
  };
}

function createEmptyDraft(): StoryModeTreeDraft {
  return {
    name: "",
    description: "",
    template: "",
    profile: createEmptyProfile(),
    children: [],
  };
}

function cloneDraft(draft: StoryModeTreeDraft): StoryModeTreeDraft {
  return {
    name: draft.name,
    description: draft.description ?? "",
    template: draft.template ?? "",
    profile: { ...draft.profile },
    children: draft.children.map((child) => cloneDraft(child)),
  };
}

function countStoryModes(nodes: StoryModeTreeNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countStoryModes(node.children), 0);
}

function findStoryModeNode(nodes: StoryModeTreeNode[], id: string): StoryModeTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    const child = findStoryModeNode(node.children, id);
    if (child) {
      return child;
    }
  }
  return null;
}

function collectDescendantIds(node: StoryModeTreeNode): string[] {
  return node.children.flatMap((child) => [child.id, ...collectDescendantIds(child)]);
}

function normalizeProfileInput(profile: StoryModeDialogState["profile"]): StoryModeProfile {
  return {
    coreDrive: profile.coreDrive.trim(),
    readerReward: profile.readerReward.trim(),
    progressionUnits: profile.progressionUnits,
    allowedConflictForms: profile.allowedConflictForms,
    forbiddenConflictForms: profile.forbiddenConflictForms,
    conflictCeiling: profile.conflictCeiling,
    resolutionStyle: profile.resolutionStyle.trim(),
    chapterUnit: profile.chapterUnit.trim(),
    volumeReward: profile.volumeReward.trim(),
    mandatorySignals: profile.mandatorySignals,
    antiSignals: profile.antiSignals,
  };
}

function toDialogState(node?: StoryModeTreeNode | null): StoryModeDialogState {
  return {
    name: node?.name ?? "",
    description: node?.description ?? "",
    template: node?.template ?? "",
    profile: node?.profile ? { ...node.profile } : createEmptyProfile(),
  };
}

export default function StoryModeManagementPage() {
  const [searchParams] = useSearchParams();
  const llm = useLLMStore();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingStoryModeId, setEditingStoryModeId] = useState("");
  const [defaultParentId, setDefaultParentId] = useState("");
  const [generationPrompt, setGenerationPrompt] = useState("");
  const [childDerivationCount, setChildDerivationCount] = useState(1);
  const [generatedChildCandidates, setGeneratedChildCandidates] = useState<StoryModeTreeDraft[]>([]);
  const [selectedGeneratedChildIndexes, setSelectedGeneratedChildIndexes] = useState<number[]>([]);
  const [activeGeneratedChildIndex, setActiveGeneratedChildIndex] = useState<number | null>(null);
  const [createDraft, setCreateDraft] = useState<StoryModeTreeDraft>(createEmptyDraft());
  const [editState, setEditState] = useState<StoryModeDialogState>(toDialogState());
  const [expansionDialogOpen, setExpansionDialogOpen] = useState(false);
  const [expansionParentId, setExpansionParentId] = useState("");
  const [expansionPrompt, setExpansionPrompt] = useState("");
  const [expansionCount, setExpansionCount] = useState(3);
  const [expansionCandidates, setExpansionCandidates] = useState<StoryModeTreeDraft[]>([]);
  const [selectedExpansionIndexes, setSelectedExpansionIndexes] = useState<number[]>([]);

  const storyModeTreeQuery = useQuery({
    queryKey: queryKeys.storyModes.all,
    queryFn: getStoryModeTree,
  });

  const storyModeTree = storyModeTreeQuery.data?.data ?? [];
  const isCreatingChild = Boolean(defaultParentId);
  const totalStoryModes = useMemo(() => countStoryModes(storyModeTree), [storyModeTree]);
  const editingStoryMode = useMemo(
    () => (editingStoryModeId ? findStoryModeNode(storyModeTree, editingStoryModeId) : null),
    [editingStoryModeId, storyModeTree],
  );
  const parentOptions = useMemo(
    () => flattenStoryModeTreeOptions(storyModeTree).filter((item) => item.level === 0),
    [storyModeTree],
  );
  const rootOptions = parentOptions;
  const blockedParentIds = useMemo(
    () => editingStoryMode ? new Set([editingStoryMode.id, ...collectDescendantIds(editingStoryMode)]) : new Set<string>(),
    [editingStoryMode],
  );

  useEffect(() => {
    if (!createDialogOpen) {
      return;
    }
    setCreateDraft(createEmptyDraft());
    setGenerationPrompt("");
    setChildDerivationCount(1);
    setGeneratedChildCandidates([]);
    setSelectedGeneratedChildIndexes([]);
    setActiveGeneratedChildIndex(null);
  }, [createDialogOpen, defaultParentId]);

  useEffect(() => {
    if (!editingStoryMode) {
      return;
    }
    setEditState(toDialogState(editingStoryMode));
  }, [editingStoryMode]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.storyModes.all });
  };

  const createMutation = useMutation({
    mutationFn: () => createStoryModeTree({
      name: createDraft.name.trim(),
      description: createDraft.description?.trim() || undefined,
      template: createDraft.template?.trim() || undefined,
      profile: normalizeProfileInput(createDraft.profile),
      parentId: defaultParentId || null,
      children: createDraft.children.map((child) => ({
        ...child,
        profile: normalizeProfileInput(child.profile),
      })),
    }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Propulsion mode has been created.");
      setCreateDialogOpen(false);
    },
  });

  const createSelectedChildrenMutation = useMutation({
    mutationFn: async () => {
      if (!defaultParentId) {
        throw new Error("Parent push mode does not exist.");
      }

      const drafts = selectedGeneratedChildIndexes
        .map((index) => generatedChildCandidates[index])
        .filter((draft): draft is StoryModeTreeDraft => Boolean(draft))
        .map((draft) => ({
          ...cloneDraft(draft),
          profile: normalizeProfileInput(draft.profile),
          children: [],
        }));

      if (drafts.length === 0) {
        throw new Error("Please select at least one subcategory candidate.");
      }

      return createStoryModeChildren({
        parentId: defaultParentId,
        drafts,
      });
    },
    onSuccess: async (response) => {
      await invalidate();
      const savedCount = response.data?.length ?? selectedGeneratedChildIndexes.length;
      toast.success(`Created in batches ${savedCount} propulsion mode subclass.`);
      setCreateDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingStoryMode) {
        throw new Error("Advance mode does not exist.");
      }
      return updateStoryMode(editingStoryMode.id, {
        name: editState.name.trim(),
        description: editState.description.trim() || null,
        template: editState.template.trim() || null,
        profile: normalizeProfileInput(editState.profile),
      });
    },
    onSuccess: async () => {
      await invalidate();
      toast.success("Propulsion mode has been updated.");
      setEditingStoryModeId("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStoryMode(id),
    onSuccess: async () => {
      await invalidate();
      toast.success("Push mode has been removed.");
    },
  });

  const expansionMutation = useMutation({
    mutationFn: async () => {
      const response = await generateStoryModeExpansion({
        ...(expansionParentId ? { parentId: expansionParentId } : {}),
        prompt: expansionPrompt.trim() || undefined,
        count: expansionCount,
        provider: llm.provider,
        model: llm.model,
        temperature: llm.temperature,
        maxTokens: llm.maxTokens,
      });
      return response.data ?? [];
    },
    onSuccess: (drafts) => {
      setExpansionCandidates(drafts.map(cloneDraft));
      setSelectedExpansionIndexes(drafts.map((_draft, index) => index));
      toast.success(`AI recommended ${drafts.length} new progression directions.`);
    },
  });

  const saveExpansionMutation = useMutation({
    mutationFn: async () => {
      const drafts = selectedExpansionIndexes
        .map((index) => expansionCandidates[index])
        .filter((draft): draft is StoryModeTreeDraft => Boolean(draft))
        .map((draft) => ({ ...cloneDraft(draft), children: [], profile: normalizeProfileInput(draft.profile) }));
      if (drafts.length === 0) throw new Error("Please select at least one propulsion mode direction.");
      if (expansionParentId) {
        return createStoryModeChildren({ parentId: expansionParentId, drafts });
      }
      const created: NovelStoryMode[] = [];
      for (const draft of drafts) {
        const response = await createStoryModeTree({
          name: draft.name,
          description: draft.description,
          template: draft.template,
          profile: draft.profile,
          parentId: null,
          children: [],
        });
        if (response.data) created.push(response.data);
      }
      return { success: true, data: created, message: "The push mode root node is created successfully." };
    },
    onSuccess: async (response) => {
      await invalidate();
      toast.success(`Added ${response.data?.length ?? selectedExpansionIndexes.length} new story modes.`);
      setExpansionDialogOpen(false);
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (): Promise<
      | { kind: "child"; drafts: StoryModeTreeDraft[] }
      | { kind: "tree"; draft: StoryModeTreeDraft | null }
    > => {
      if (isCreatingChild) {
        const response = await generateStoryModeChild({
          parentId: defaultParentId,
          prompt: generationPrompt.trim() || undefined,
          count: childDerivationCount,
          provider: llm.provider,
          model: llm.model,
          temperature: llm.temperature,
          maxTokens: llm.maxTokens,
        });
        return {
          kind: "child",
          drafts: response.data ?? [],
        };
      }

      const response = await generateStoryModeTree({
        prompt: generationPrompt.trim(),
        provider: llm.provider,
        model: llm.model,
        temperature: llm.temperature,
        maxTokens: llm.maxTokens,
      });
      return {
        kind: "tree",
        draft: response.data ?? null,
      };
    },
    onSuccess: (result) => {
      if (result.kind === "child") {
        const candidates = result.drafts.map((item) => cloneDraft(item));
        if (candidates.length === 0) {
          return;
        }
        setGeneratedChildCandidates(candidates);
        setSelectedGeneratedChildIndexes(candidates.map((_item, index) => index));
        setActiveGeneratedChildIndex(0);
        setCreateDraft(cloneDraft(candidates[0]));
        toast.success(`AI generated ${candidates.length} A draft propulsion mode subclass.`);
        return;
      }
      setSelectedGeneratedChildIndexes([]);
      setActiveGeneratedChildIndex(null);
      if (!result.draft) {
        return;
      }
      setGeneratedChildCandidates([]);
      setCreateDraft(cloneDraft(result.draft));
      toast.success("Draft AI propulsion mode tree generated.");
    },
  });

  const handleCreateRoot = () => {
    setDefaultParentId("");
    setCreateDialogOpen(true);
  };

  const handleCreateChild = (parentId: string) => {
    setDefaultParentId(parentId);
    setCreateDialogOpen(true);
  };

  const updateCreateDraft = (updater: (draft: StoryModeTreeDraft) => StoryModeTreeDraft) => {
    setCreateDraft((prev) => {
      const next = updater(prev);
      if (isCreatingChild && activeGeneratedChildIndex !== null) {
        setGeneratedChildCandidates((prevCandidates) => prevCandidates.map((candidate, index) => (
          index === activeGeneratedChildIndex ? cloneDraft(next) : candidate
        )));
      }
      return next;
    });
  };

  const handleApplyGeneratedChild = (draft: StoryModeTreeDraft, index: number) => {
    setActiveGeneratedChildIndex(index);
    setCreateDraft(cloneDraft(draft));
  };

  const handleToggleGeneratedChildSelection = (index: number) => {
    setSelectedGeneratedChildIndexes((prev) => (
      prev.includes(index)
        ? prev.filter((item) => item !== index)
        : [...prev, index].sort((left, right) => left - right)
    ));
  };

  const handleDelete = (node: StoryModeTreeNode) => {
    const descendantCount = collectDescendantIds(node).length;
    const message = descendantCount > 0
      ? `Delete story mode "${node.name}"? This will also delete ${descendantCount} subcategories under it. This action cannot be undone.`
      : `Delete story mode "${node.name}"? This action cannot be undone.`;
    const confirmed = window.confirm(message);
    if (!confirmed) {
      return;
    }
    deleteMutation.mutate(node.id);
  };

  const selectedParentLabel = useMemo(() => {
    if (!defaultParentId) {
      return "Created as root push mode";
    }
    return parentOptions.find((item) => item.id === defaultParentId)?.path ?? "Created as root push mode";
  }, [defaultParentId, parentOptions]);

  const editParentOptions = useMemo(
    () => parentOptions.filter((item) => !blockedParentIds.has(item.id)),
    [blockedParentIds, parentOptions],
  );

  return (
    <div className="space-y-4">
      <StoryModeCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        isCreatingChild={isCreatingChild}
        selectedParentLabel={selectedParentLabel}
        generationPrompt={generationPrompt}
        onGenerationPromptChange={setGenerationPrompt}
        childDerivationCount={childDerivationCount}
        onChildDerivationCountChange={setChildDerivationCount}
        draft={createDraft}
        onDraftChange={updateCreateDraft}
        generatedChildCandidates={generatedChildCandidates}
        selectedGeneratedChildIndexes={selectedGeneratedChildIndexes}
        activeGeneratedChildIndex={activeGeneratedChildIndex}
        onApplyGeneratedChild={handleApplyGeneratedChild}
        onToggleGeneratedChildSelection={handleToggleGeneratedChildSelection}
        onGenerate={() => generateMutation.mutate()}
        onReset={() => {
          setActiveGeneratedChildIndex(null);
          setCreateDraft(createEmptyDraft());
        }}
        isGenerating={generateMutation.isPending}
        onSaveCurrent={() => createMutation.mutate()}
        isSavingCurrent={createMutation.isPending}
        onSaveSelectedChildren={() => createSelectedChildrenMutation.mutate()}
        isSavingSelectedChildren={createSelectedChildrenMutation.isPending}
      />

      <StoryModeExpansionDialog
        open={expansionDialogOpen}
        onOpenChange={(open) => {
          setExpansionDialogOpen(open);
          if (!open) {
            setExpansionCandidates([]);
            setSelectedExpansionIndexes([]);
          }
        }}
        rootOptions={rootOptions}
        parentId={expansionParentId}
        onParentIdChange={(id) => { setExpansionParentId(id); setExpansionCandidates([]); setSelectedExpansionIndexes([]); }}
        prompt={expansionPrompt}
        onPromptChange={setExpansionPrompt}
        count={expansionCount}
        onCountChange={setExpansionCount}
        candidates={expansionCandidates}
        selectedIndexes={selectedExpansionIndexes}
        onToggle={(index) => setSelectedExpansionIndexes((prev) => prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index].sort((a, b) => a - b))}
        onGenerate={() => expansionMutation.mutate()}
        onSave={() => saveExpansionMutation.mutate()}
        isGenerating={expansionMutation.isPending}
        isSaving={saveExpansionMutation.isPending}
      />

      <Dialog open={Boolean(editingStoryMode)} onOpenChange={(open) => { if (!open) setEditingStoryModeId(""); }}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit advance mode</DialogTitle>
            <DialogDescription>
              Name, description, template and profile can be modified. The two-level tree restriction will remain.
            </DialogDescription>
          </DialogHeader>

          {editingStoryMode ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                Current parent:{editingStoryMode.parentId ? (editParentOptions.find((item) => item.id === editingStoryMode.parentId)?.path ?? "not found") : "root node"}
              </div>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Name</span>
                <Input value={editState.name} onChange={(event) => setEditState((prev) => ({ ...prev, name: event.target.value }))} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Description</span>
                <textarea
                  rows={3}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={editState.description}
                  onChange={(event) => setEditState((prev) => ({ ...prev, description: event.target.value }))}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Manual template supplement</span>
                <textarea
                  rows={3}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={editState.template}
                  onChange={(event) => setEditState((prev) => ({ ...prev, template: event.target.value }))}
                />
              </label>
              <StoryModeProfileFields
                value={editState.profile}
                onChange={(profile) => setEditState((prev) => ({ ...prev, profile }))}
              />
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setEditingStoryModeId("")}>
              Cancel
            </Button>
            <Button type="button" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || !editState.name.trim()}>
              {updateMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Advancing Pattern Library</CardTitle>
            <CardDescription>
              The advancement modes of the work are maintained here, such as system flow, invincible flow, farming flow, and daily healing. It answers "what does this book rely on to continue to advance and be realized?" and will serve as a hard constraint input for subsequent planning and generation.
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-sm text-muted-foreground">Current number of advancement modes:{totalStoryModes}</div>
            <div className="flex gap-2">
              {storyModeTree.length > 0 ? (
                <Button type="button" variant="outline" onClick={() => {
                  setExpansionParentId(rootOptions[0]?.id ?? "");
                  setExpansionCandidates([]);
                  setSelectedExpansionIndexes([]);
                  setExpansionDialogOpen(true);
                }}>
                  extended propulsion model
                </Button>
              ) : null}
              <Button type="button" onClick={handleCreateRoot}>Create a new push mode tree</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {storyModeTreeQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading push mode tree...</div>
          ) : null}

          {!storyModeTreeQuery.isLoading && storyModeTree.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <div className="text-sm font-medium text-foreground">There is no push mode yet</div>
              <div className="mt-1 text-sm text-muted-foreground">
                You can manually create a root advancement pattern first, or you can directly let AI generate a structured draft.
              </div>
              <div className="mt-4">
                <Button type="button" onClick={handleCreateRoot}>
                  Start creating
                </Button>
              </div>
            </div>
          ) : null}

          {!storyModeTreeQuery.isLoading && storyModeTree.length > 0 ? (
            <StoryModeTreeBrowser
              nodes={storyModeTree}
              initialSelectedId={searchParams.get("selectedId") ?? ""}
              onCreateChild={handleCreateChild}
              onEdit={setEditingStoryModeId}
              onDelete={handleDelete}
              deletingId={deleteMutation.isPending ? deleteMutation.variables : undefined}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
