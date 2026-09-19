import type { Dispatch, SetStateAction } from "react";
import type { World } from "@ai-novel/shared/types/world";
import { Button } from "@/components/ui/button";
import StreamOutput from "@/components/common/StreamOutput";
import {
  LAYERS,
  LAYER_STATUS_LABELS,
  pickLayerFieldText,
  type LayerKey,
  type RefineAttribute,
  REFINE_ATTRIBUTE_OPTIONS,
} from "./worldWorkspaceShared";
import SelectControl from "@/components/common/SelectControl";

interface WorldLayersTabProps {
  world?: World;
  selectedLayer: LayerKey;
  setSelectedLayer: (layer: LayerKey) => void;
  layerDrafts: Partial<Record<LayerKey, string>>;
  setLayerDrafts: Dispatch<SetStateAction<Partial<Record<LayerKey, string>>>>;
  layerStates: Record<string, { status: string; updatedAt: string }>;
  isInitialLayerGeneration: boolean;
  generateAllPending: boolean;
  generateLayerPending: boolean;
  generateLayerVariable?: LayerKey;
  saveLayerPending: boolean;
  saveLayerVariable?: { layerKey: LayerKey; content: string };
  confirmLayerPending: boolean;
  confirmLayerVariable?: LayerKey;
  onGenerateAll: () => void;
  onGenerateLayer: (layer: LayerKey) => void;
  onSaveLayer: (payload: { layerKey: LayerKey; content: string }) => void;
  onConfirmLayer: (layer: LayerKey) => void;
  refineAttribute: RefineAttribute;
  setRefineAttribute: (value: RefineAttribute) => void;
  refineMode: "replace" | "alternatives";
  setRefineMode: (value: "replace" | "alternatives") => void;
  refineLevel: "light" | "deep";
  setRefineLevel: (value: "light" | "deep") => void;
  onStartRefine: () => void;
  refineStreaming: boolean;
  refineContent: string;
  onAbortRefine: () => void;
}

export default function WorldLayersTab(props: WorldLayersTabProps) {
  const {
    world,
    selectedLayer,
    setSelectedLayer,
    layerDrafts,
    setLayerDrafts,
    layerStates,
    isInitialLayerGeneration,
    generateAllPending,
    generateLayerPending,
    generateLayerVariable,
    saveLayerPending,
    saveLayerVariable,
    confirmLayerPending,
    confirmLayerVariable,
    onGenerateAll,
    onGenerateLayer,
    onSaveLayer,
    onConfirmLayer,
    refineAttribute,
    setRefineAttribute,
    refineMode,
    setRefineMode,
    refineLevel,
    setRefineLevel,
    onStartRefine,
    refineStreaming,
    refineContent,
    onAbortRefine,
  } = props;
  const selectedLayerMeta = LAYERS.find((layer) => layer.key === selectedLayer) ?? LAYERS[0];
  const worldRecord = world as unknown as Record<string, unknown> | undefined;
  const hasSelectedDraft = Object.prototype.hasOwnProperty.call(layerDrafts, selectedLayerMeta.key);
  const selectedLayerValue = hasSelectedDraft
    ? (layerDrafts[selectedLayerMeta.key] ?? "")
    : pickLayerFieldText(selectedLayerMeta.key, worldRecord);
  const selectedLayerStatus = layerStates[selectedLayerMeta.key]?.status ?? "pending";
  const isGeneratingSelectedLayer = generateLayerPending && generateLayerVariable === selectedLayerMeta.key;
  const isSavingSelectedLayer =
    saveLayerPending && saveLayerVariable?.layerKey === selectedLayerMeta.key;
  const isConfirmingSelectedLayer =
    confirmLayerPending && confirmLayerVariable === selectedLayerMeta.key;

  return (
    <section className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">AI hierarchical organization</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Compress the complete world manual into a six-level writing summary to facilitate planning and text generation and quick recall.</p>
        </div>

        <div className="flex flex-col gap-3 rounded-3xl bg-primary/[0.055] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-medium">{isInitialLayerGeneration ? "Generate six-level writing summaries" : "Updated Six-Level Writing Summary"}</div>
            <div className="mt-1 text-xs leading-5 text-muted-foreground">
              {isInitialLayerGeneration
                ? "The AI will extract six levels of content from the existing world manual: foundation, power, society, culture, history and conflict."
                : "After the world manual is adjusted, the entire summary can be rearranged, or only one layer can be modified."}
            </div>
          </div>
          <Button className="shrink-0 rounded-full" onClick={onGenerateAll} disabled={generateAllPending || !world}>
            {generateAllPending ? "Organizing..." : isInitialLayerGeneration ? "AI organizes six-layer summaries" : "Reorganize the six-level summary"}
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-2 rounded-3xl bg-muted/20 p-3">
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Select level</div>
            <div className="space-y-2">
              {LAYERS.map((layer) => {
                const layerStatus = layerStates[layer.key]?.status ?? "pending";
                const hasDraft = Object.prototype.hasOwnProperty.call(layerDrafts, layer.key);

                return (
                  <button
                    key={layer.key}
                    type="button"
                    className={[
                      "w-full rounded-2xl px-3 py-2.5 text-left text-sm transition-colors",
                      selectedLayer === layer.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/60",
                    ].join(" ")}
                    onClick={() => setSelectedLayer(layer.key)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{layer.label}</span>
                      {hasDraft ? <span className="text-xs text-primary">Draft</span> : null}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {LAYER_STATUS_LABELS[layerStatus] ?? layerStatus}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-border/35 bg-card/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium">{selectedLayerMeta.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Status: {LAYER_STATUS_LABELS[selectedLayerStatus] ?? selectedLayerStatus}
                </div>
              </div>
              {hasSelectedDraft ? <div className="text-xs text-primary">There are unsaved drafts</div> : null}
            </div>
            <textarea
              className="min-h-[300px] w-full rounded-2xl border border-border/45 bg-background/80 p-4 text-sm leading-6"
              value={selectedLayerValue}
              onChange={(event) =>
                setLayerDrafts((prev) => ({
                  ...prev,
                  [selectedLayerMeta.key]: event.target.value,
                }))
              }
            />
            <div className="flex flex-wrap gap-2">
              <Button
                className="rounded-full"
                onClick={() => {
                  if (isInitialLayerGeneration) {
                    onGenerateAll();
                    return;
                  }
                  onGenerateLayer(selectedLayerMeta.key);
                }}
                disabled={generateAllPending || generateLayerPending || !world}
              >
                {isInitialLayerGeneration
                  ? generateAllPending
                    ? "Six layers are being generated..."
                    : "For the first time, AI generates six layers"
                  : isGeneratingSelectedLayer
                    ? "Rewriting..."
                    : "AI organizes this layer"}
              </Button>
              <Button
                className="rounded-full"
                variant="secondary"
                onClick={() => onSaveLayer({ layerKey: selectedLayerMeta.key, content: selectedLayerValue })}
                disabled={saveLayerPending || generateAllPending || !selectedLayerValue.trim()}
              >
                {isSavingSelectedLayer ? "Saving..." : "Save this layer"}
              </Button>
              <Button
                className="rounded-full"
                variant="outline"
                onClick={() => onConfirmLayer(selectedLayerMeta.key)}
                disabled={confirmLayerPending || generateAllPending}
              >
                {isConfirmingSelectedLayer ? "Confirming..." : "Confirm this layer"}
              </Button>
            </div>
          </div>
        </div>

        <details className="group rounded-3xl bg-muted/20 p-5">
          <summary className="cursor-pointer list-none marker:hidden">
            <div className="font-medium">AI refines current content</div>
            <div className="mt-1 text-xs text-muted-foreground">Expand when you need to adjust expression, depth, or alternative directions.</div>
          </summary>
          <div className="mt-4 grid gap-2 md:grid-cols-4">
            <SelectControl
              className="rounded-xl border border-border/45 bg-background p-2 text-sm"
              value={refineAttribute}
              onChange={(event) => setRefineAttribute(event.target.value as RefineAttribute)}
            >
              {REFINE_ATTRIBUTE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </SelectControl>
            <SelectControl
              className="rounded-xl border border-border/45 bg-background p-2 text-sm"
              value={refineMode}
              onChange={(event) => setRefineMode(event.target.value as "replace" | "alternatives")}
            >
              <option value="replace">Replacement optimization</option>
              <option value="alternatives">Provide alternatives</option>
            </SelectControl>
            <SelectControl
              className="rounded-xl border border-border/45 bg-background p-2 text-sm"
              value={refineLevel}
              onChange={(event) => setRefineLevel(event.target.value as "light" | "deep")}
            >
              <option value="light">Mild</option>
              <option value="deep">Depth</option>
            </SelectControl>
            <Button className="rounded-full" onClick={onStartRefine} disabled={refineStreaming}>
              {refineStreaming ? "Under revision..." : selectedLayer === "foundation" ? "Refining the foundation of the world" : "Refine this layer"}
            </Button>
          </div>
          <StreamOutput content={refineContent} isStreaming={refineStreaming} onAbort={onAbortRefine} />
        </details>
    </section>
  );
}
