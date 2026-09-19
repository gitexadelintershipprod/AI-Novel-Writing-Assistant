import { useState, type Dispatch, type SetStateAction } from "react";
import { GitCompareArrows, GitFork, Map, Network, Workflow } from "lucide-react";
import type { World, WorldSnapshot } from "@ai-novel/shared/types/world";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import KnowledgeBindingPanel from "@/components/knowledge/KnowledgeBindingPanel";
import SelectControl from "@/components/common/SelectControl";

interface WorldLibraryItem {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  worldType?: string | null;
  usageCount: number;
  sourceWorldId?: string | null;
}

interface WorldAssetsTabProps {
  worldId: string;
  world?: World;
  selectedLayerPrimaryField: "background" | "magicSystem" | "politics" | "cultures" | "history" | "conflicts";
  libraryKeyword: string;
  setLibraryKeyword: Dispatch<SetStateAction<string>>;
  libraryCategory: string;
  setLibraryCategory: Dispatch<SetStateAction<string>>;
  publishName: string;
  setPublishName: Dispatch<SetStateAction<string>>;
  publishCategory: string;
  setPublishCategory: Dispatch<SetStateAction<string>>;
  publishDescription: string;
  setPublishDescription: Dispatch<SetStateAction<string>>;
  snapshotLabel: string;
  setSnapshotLabel: Dispatch<SetStateAction<string>>;
  diffFrom: string;
  setDiffFrom: Dispatch<SetStateAction<string>>;
  diffTo: string;
  setDiffTo: Dispatch<SetStateAction<string>>;
  importFormat: "json" | "markdown" | "text";
  setImportFormat: Dispatch<SetStateAction<"json" | "markdown" | "text">>;
  importContent: string;
  setImportContent: Dispatch<SetStateAction<string>>;
  libraryItems: WorldLibraryItem[];
  snapshots: WorldSnapshot[];
  diffChanges: Array<{ field: string; before: string | null; after: string | null }>;
  createSnapshotPending: boolean;
  publishPending: boolean;
  importPending: boolean;
  onRefreshLibrary: () => void;
  onInjectLibraryField: (libraryId: string) => void;
  onInjectLibraryStructure: (libraryId: string, targetCollection: "forces" | "locations") => void;
  onPublishLibrary: () => void;
  onCreateSnapshot: () => void;
  onRestoreSnapshot: (snapshotId: string) => void;
  onDiffSnapshots: () => void;
  onExport: (format: "markdown" | "json") => Promise<void>;
  onImport: () => void;
}

type AssetTool = "visualAssets" | "references" | "library" | "snapshots" | "export" | "import";

const WORLD_ASSET_PRESETS = [
  {
    icon: Map,
    title: "world map",
    description: "Use areas, roads, borders, and story locations to explain how characters move and where conflict breaks out.",
    readiness: "First make up the story stage, location risks and power control areas.",
  },
  {
    icon: Network,
    title: "power map",
    description: "Organize the relationships of forces, camps, allies, enemies and vassals into a visual relationship network.",
    readiness: "First make up for the main forces, current goals and mutual pressure.",
  },
  {
    icon: GitFork,
    title: "world timeline",
    description: "Record major events, disasters, dynasty changes and situation changes to keep the world's progress on track.",
    readiness: "First, cover the core conflicts, common consequences and key historical nodes.",
  },
  {
    icon: GitCompareArrows,
    title: "role network",
    description: "Connect characters with forces, locations, resources and taboo relationships to reduce setting drift.",
    readiness: "First make up for character affiliation, camp pressure and key locations.",
  },
  {
    icon: Workflow,
    title: "Power system tree",
    description: "Organize sources of power, upgrade paths, costs, and taboo boundaries into a hierarchical structure.",
    readiness: "First, make up for the core rules, costs and unbreakable boundaries.",
  },
];

function AssetToolButton({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        "shrink-0 rounded-full px-4 py-2 text-sm transition-colors",
        selected ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
      ].join(" ")}
      onClick={onClick}
      title={description}
    >
      {label}
    </button>
  );
}

export default function WorldAssetsTab(props: WorldAssetsTabProps) {
  const [activeTool, setActiveTool] = useState<AssetTool>("visualAssets");
  const {
    selectedLayerPrimaryField,
    libraryKeyword,
    setLibraryKeyword,
    libraryCategory,
    setLibraryCategory,
    publishName,
    setPublishName,
    publishCategory,
    setPublishCategory,
    publishDescription,
    setPublishDescription,
    snapshotLabel,
    setSnapshotLabel,
    diffFrom,
    setDiffFrom,
    diffTo,
    setDiffTo,
    importFormat,
    setImportFormat,
    importContent,
    setImportContent,
    libraryItems,
    snapshots,
    diffChanges,
    createSnapshotPending,
    publishPending,
    importPending,
    onRefreshLibrary,
    onInjectLibraryField,
    onInjectLibraryStructure,
    onPublishLibrary,
    onCreateSnapshot,
    onRestoreSnapshot,
    onDiffSnapshots,
    onExport,
    onImport,
  } = props;

  return (
    <section className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">World data and versions</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Manage reference materials, reusable materials, version backups, import and export, and map and atlas capabilities are also accessible here.</p>
        </div>

        <div className="flex gap-1 overflow-x-auto rounded-full bg-muted/30 p-1">
          <AssetToolButton
            label="Maps and Atlases"
            description="Reserve world asset entrance."
            selected={activeTool === "visualAssets"}
            onClick={() => setActiveTool("visualAssets")}
          />
          <AssetToolButton
            label="References"
            description="Relate data that supports world settings."
            selected={activeTool === "references"}
            onClick={() => setActiveTool("references")}
          />
          <AssetToolButton
            label="world material"
            description="Reuse locations, forces, resources and other content that can be deposited."
            selected={activeTool === "library"}
            onClick={() => setActiveTool("library")}
          />
          <AssetToolButton
            label="version snapshot"
            description="Save the version and compare the differences between the two settings."
            selected={activeTool === "snapshots"}
            onClick={() => setActiveTool("snapshots")}
          />
          <AssetToolButton
            label="Export backup"
            description="Copy Markdown or JSON."
            selected={activeTool === "export"}
            onClick={() => setActiveTool("export")}
          />
          <AssetToolButton
            label="Import text"
            description="Create worlds from text, Markdown, or JSON."
            selected={activeTool === "import"}
            onClick={() => setActiveTool("import")}
          />
        </div>

        {activeTool === "visualAssets" ? (
          <div className="rounded-3xl border border-border/35 bg-card/70 p-5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="font-medium">World Asset Planning</div>
                <div className="mt-1 text-sm leading-6 text-muted-foreground">
                  Maps, power maps, timelines, and system trees all extend from the World Manual. First sort out the rules, forces, locations and tensions, and then generate visual assets.
                </div>
              </div>
              <Badge variant="secondary" className="border-0 bg-muted/60 font-normal">reserved capacity</Badge>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {WORLD_ASSET_PRESETS.map((asset) => {
                const Icon = asset.icon;
                return (
                  <div key={asset.title} className="rounded-2xl bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                      {asset.title}
                    </div>
                    <div className="mt-2 text-xs leading-5 text-muted-foreground">{asset.description}</div>
                    <div className="mt-3 rounded-xl bg-background/70 p-3 text-xs leading-5 text-muted-foreground">
                      {asset.readiness}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {activeTool === "references" ? (
          <div className="rounded-3xl border border-border/35 bg-card/70 p-5">
            <div className="mb-3 font-medium">References</div>
            <KnowledgeBindingPanel targetType="world" targetId={props.worldId} title="References" />
          </div>
        ) : null}

        {activeTool === "library" ? (
          <div className="space-y-4 rounded-3xl border border-border/35 bg-card/70 p-5">
            <div className="font-medium">world material</div>
            <div className="grid gap-2 md:grid-cols-3">
              <Input
                placeholder="keywords"
                value={libraryKeyword}
                onChange={(event) => setLibraryKeyword(event.target.value)}
              />
              <SelectControl
                className="w-full rounded-md border bg-background p-2 text-sm"
                value={libraryCategory}
                onChange={(event) => setLibraryCategory(event.target.value)}
              >
                <option value="all">All categories</option>
                <option value="terrain">Geography and landforms</option>
                <option value="race">race</option>
                <option value="power_system">power system</option>
                <option value="organization">organizational power</option>
                <option value="resource">Resources</option>
                <option value="event">event</option>
                <option value="artifact">Props and wonders</option>
                <option value="custom">Custom</option>
              </SelectControl>
              <Button variant="outline" onClick={onRefreshLibrary}>
                Refresh
              </Button>
            </div>
            <div className="space-y-3 rounded-2xl bg-muted/20 p-4">
              <div className="text-xs font-semibold text-muted-foreground">
                Save current settings as world material
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <Input
                  placeholder="Material name"
                  value={publishName}
                  onChange={(event) => setPublishName(event.target.value)}
                />
                <SelectControl
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={publishCategory}
                  onChange={(event) => setPublishCategory(event.target.value)}
                >
                  <option value="custom">Custom</option>
                  <option value="terrain">Geography and landforms</option>
                  <option value="race">race</option>
                  <option value="power_system">power system</option>
                  <option value="organization">organizational power</option>
                  <option value="resource">Resources</option>
                  <option value="event">event</option>
                  <option value="artifact">Props and wonders</option>
                </SelectControl>
                <Button onClick={onPublishLibrary} disabled={publishPending}>
                  {publishPending ? "Saving..." : "Saving assets"}
                </Button>
              </div>
              <textarea
                className="min-h-[80px] w-full rounded-md border bg-background p-2 text-sm"
                value={publishDescription}
                onChange={(event) => setPublishDescription(event.target.value)}
                placeholder="Optional description (defaults to current hierarchical content when left blank)"
              />
            </div>
            {libraryItems.map((item) => (
              <div key={item.id} className="space-y-3 rounded-2xl border border-border/35 p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div>{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.category} /Number of uses ={item.usageCount}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => onInjectLibraryField(item.id)}>
                    Join the current layer ({selectedLayerPrimaryField}）
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onInjectLibraryStructure(item.id, "forces")}>
                    Join the force manual
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onInjectLibraryStructure(item.id, "locations")}>
                    Join the location book
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {activeTool === "snapshots" ? (
          <div className="space-y-4 rounded-3xl border border-border/35 bg-card/70 p-5">
          <div className="font-medium">version snapshot</div>
          <div className="flex gap-2">
            <Input
              placeholder="Snapshot tag (optional)"
              value={snapshotLabel}
              onChange={(event) => setSnapshotLabel(event.target.value)}
            />
            <Button onClick={onCreateSnapshot} disabled={createSnapshotPending}>
              Create snapshot
            </Button>
          </div>
          {snapshots.map((snapshot) => (
            <div key={snapshot.id} className="flex items-center justify-between rounded-2xl bg-muted/20 p-3 text-sm">
              <div>
                {snapshot.label ?? snapshot.id.slice(0, 8)} / {new Date(snapshot.createdAt).toLocaleString()}
              </div>
              <Button size="sm" variant="outline" onClick={() => onRestoreSnapshot(snapshot.id)}>
                restore
              </Button>
            </div>
          ))}
          <div className="grid gap-2 md:grid-cols-3">
            <SelectControl
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={diffFrom}
              onChange={(event) => setDiffFrom(event.target.value)}
            >
              <option value="">Starting snapshot</option>
              {snapshots.map((snapshot) => (
                <option key={`from-${snapshot.id}`} value={snapshot.id}>
                  {snapshot.label ?? snapshot.id.slice(0, 8)}
                </option>
              ))}
            </SelectControl>
            <SelectControl
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={diffTo}
              onChange={(event) => setDiffTo(event.target.value)}
            >
              <option value="">target snapshot</option>
              {snapshots.map((snapshot) => (
                <option key={`to-${snapshot.id}`} value={snapshot.id}>
                  {snapshot.label ?? snapshot.id.slice(0, 8)}
                </option>
              ))}
            </SelectControl>
            <Button onClick={onDiffSnapshots} disabled={!diffFrom || !diffTo}>
              Compare the differences
            </Button>
          </div>
          {diffChanges.map((change) => (
            <div key={change.field} className="rounded-2xl bg-muted/20 p-3 text-xs">
              {change.field}: {change.before ?? "empty"} {"->"} {change.after ?? "empty"}
            </div>
          ))}
          </div>
        ) : null}

        {activeTool === "export" ? (
          <div className="space-y-3 rounded-3xl border border-border/35 bg-card/70 p-5">
          <div className="font-medium">Export backup</div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void onExport("markdown")}>
              Export Markdown (copy to clipboard)
            </Button>
            <Button variant="secondary" onClick={() => void onExport("json")}>
              Export JSON (copy to clipboard)
            </Button>
          </div>
          </div>
        ) : null}

        {activeTool === "import" ? (
          <div className="space-y-3 rounded-3xl border border-border/35 bg-card/70 p-5">
          <div className="font-medium">Import text</div>
          <SelectControl
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={importFormat}
            onChange={(event) => setImportFormat(event.target.value as "json" | "markdown" | "text")}
          >
            <option value="text">plain text</option>
            <option value="markdown">Markdown</option>
            <option value="json">JSON</option>
          </SelectControl>
          <textarea
            className="min-h-[160px] w-full rounded-md border bg-background p-2 text-sm"
            value={importContent}
            onChange={(event) => setImportContent(event.target.value)}
            placeholder="Please paste the content you want to import"
          />
          <Button onClick={onImport} disabled={importPending || !importContent.trim()}>
            {importPending ? "Importing..." : "Import as new world"}
          </Button>
          </div>
        ) : null}
    </section>
  );
}
