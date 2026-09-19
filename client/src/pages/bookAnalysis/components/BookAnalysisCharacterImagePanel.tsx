import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BookAnalysisCharacter } from "@ai-novel/shared/types/bookAnalysisCharacter";
import type { ImageAsset } from "@ai-novel/shared/types/image";
import {
  deleteBookAnalysisCharacterImage,
  generateBookAnalysisCharacterImage,
  listBookAnalysisCharacterImages,
  prepareBookAnalysisCharacterImage,
  promoteBookAnalysisCharacter,
  setPrimaryBookAnalysisCharacterImage,
} from "@/api/bookAnalysis";
import { getImageTask, resolveImageAssetUrl } from "@/api/images";
import { queryKeys } from "@/api/queryKeys";
import { ImageGenerationConfirmDialog } from "@/components/image/ImageGenerationConfirmDialog";
import { useImageGenerationFlow } from "@/components/image/useImageGenerationFlow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppDialogContent, Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";

const IMAGE_STATUS_TEXT: Record<string, string> = {
  queued: "Queuing",
  running: "Generating",
  succeeded: "Generated successfully",
  failed: "Build failed",
  cancelled: "Canceled",
};

interface BookAnalysisCharacterImagePanelProps {
  analysisId: string;
  character: BookAnalysisCharacter;
  disabled: boolean;
}

export default function BookAnalysisCharacterImagePanel({
  analysisId,
  character,
  disabled,
}: BookAnalysisCharacterImagePanelProps) {
  const queryClient = useQueryClient();
  const flow = useImageGenerationFlow();
  const [activeTaskId, setActiveTaskId] = useState("");
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [includePrimaryImage, setIncludePrimaryImage] = useState(true);

  const assetsQuery = useQuery({
    queryKey: queryKeys.images.assets("book_analysis_character", character.id),
    queryFn: () => listBookAnalysisCharacterImages(analysisId, character.id),
  });
  const assets = assetsQuery.data?.data ?? [];
  const primaryAsset = useMemo(() => assets.find((item) => item.isPrimary) ?? assets[0] ?? null, [assets]);

  const taskQuery = useQuery({
    queryKey: queryKeys.images.task(activeTaskId || "none"),
    queryFn: () => getImageTask(activeTaskId),
    enabled: Boolean(activeTaskId),
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      return status === "queued" || status === "running" ? 1500 : false;
    },
  });

  useEffect(() => {
    const task = taskQuery.data?.data;
    if (!task || !activeTaskId) {
      return;
    }
    if (task.status === "queued" || task.status === "running") {
      return;
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.images.assets("book_analysis_character", character.id) });
    setActiveTaskId("");
  }, [activeTaskId, character.id, queryClient, taskQuery.data?.data]);

  const setPrimaryMutation = useMutation({
    mutationFn: (assetId: string) => setPrimaryBookAnalysisCharacterImage(analysisId, character.id, assetId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.images.assets("book_analysis_character", character.id) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (asset: ImageAsset) => deleteBookAnalysisCharacterImage(analysisId, character.id, asset.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.images.assets("book_analysis_character", character.id) });
    },
  });

  const promoteMutation = useMutation({
    mutationFn: () => promoteBookAnalysisCharacter(analysisId, character.id, { includePrimaryImage }),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.baseCharacters.all });
      setPromoteOpen(false);
      toast.success(response.data?.baseCharacter.name ? `Added to character library:${response.data.baseCharacter.name}` : "Added to character library.");
    },
  });

  const startGenerate = () => {
    void flow.start({
      prepare: async () => (await prepareBookAnalysisCharacterImage(analysisId, character.id)).data!,
      generate: async (overrides) => {
        const response = await generateBookAnalysisCharacterImage(analysisId, character.id, {
          count: 2,
          stylePreset: "Realistic character setting diagram",
          overrides,
        });
        if (response.data?.id) {
          setActiveTaskId(response.data.id);
        }
        return response;
      },
    });
  };

  const activeTask = taskQuery.data?.data;

  return (
    <div className="mt-5 space-y-4 border-t border-border/35 pt-4">
      <ImageGenerationConfirmDialog {...flow.dialogProps} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">Imagery</span>
          <span className="text-xs text-muted-foreground">{assets.length} images</span>
          {primaryAsset ? <Badge variant="secondary" className="border-0 font-normal">Main image has been set</Badge> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" className="rounded-full" onClick={startGenerate} disabled={disabled || Boolean(activeTaskId)}>
            Generate image diagram
          </Button>
          <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setPromoteOpen(true)} disabled={disabled || promoteMutation.isPending}>
            Add to character library
          </Button>
        </div>
      </div>

      {activeTask ? (
        <div className="rounded-xl bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Current tasks:{IMAGE_STATUS_TEXT[activeTask.status] ?? activeTask.status}
          {activeTask.error ? <span className="ml-2 text-destructive">{activeTask.error}</span> : null}
        </div>
      ) : null}

      {assetsQuery.isLoading ? <div className="text-xs text-muted-foreground">Loading image image.</div> : null}
      {!assetsQuery.isLoading && assets.length === 0 ? (
        <div className="text-xs text-muted-foreground">You can generate a character image map and then decide whether to add it to the character library.</div>
      ) : null}
      {assets.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {assets.map((asset) => (
            <div key={asset.id} className="space-y-2 overflow-hidden rounded-xl bg-muted/20 p-2">
              <img
                src={resolveImageAssetUrl(asset.url)}
                alt={`${character.name}-Image map`}
                className="aspect-square w-full rounded-lg object-cover"
                loading="lazy"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{asset.isPrimary ? "Main picture" : "candidate image"}</span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full"
                    onClick={() => setPrimaryMutation.mutate(asset.id)}
                    disabled={asset.isPrimary || setPrimaryMutation.isPending}
                  >
                    Set main picture
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (window.confirm("Delete this appearance image?")) {
                        deleteMutation.mutate(asset);
                      }
                    }}
                    disabled={deleteMutation.isPending && deleteMutation.variables?.id === asset.id}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <AppDialogContent
          title={`Add to character library:${character.name}`}
          bodyClassName="space-y-3"
          footer={(
            <>
              <Button type="button" variant="outline" onClick={() => setPromoteOpen(false)} disabled={promoteMutation.isPending}>
                Cancel
              </Button>
              <Button type="button" onClick={() => promoteMutation.mutate()} disabled={promoteMutation.isPending}>
                {promoteMutation.isPending ? "Joining..." : "Confirm to join"}
              </Button>
            </>
          )}
        >
          <div className="text-sm text-muted-foreground">
            The character field of the character will be copied to the character library; the book-opening evidence and scene records will still be retained in the book-opening file.
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includePrimaryImage}
              onChange={(event) => setIncludePrimaryImage(event.target.checked)}
            />
            <span>At the same time, add the main image to the character library</span>
          </label>
          {promoteMutation.error ? (
            <div className="text-sm text-destructive">
              {promoteMutation.error instanceof Error ? promoteMutation.error.message : "Failed to join the character library."}
            </div>
          ) : null}
        </AppDialogContent>
      </Dialog>
    </div>
  );
}
