import type { LucideIcon } from "lucide-react";
import {
  BookOpenCheck,
  CircleAlert,
  Database,
  LoaderCircle,
  RefreshCw,
  SearchCheck,
  Upload,
} from "lucide-react";
import {
  AssetLibraryHeader,
  AssetLibraryRecommendation,
  type AssetLibraryTone,
} from "@/components/assetLibrary";
import OpenInCreativeHubButton from "@/components/creativeHub/OpenInCreativeHubButton";
import { Button } from "@/components/ui/button";

type RecommendationAction = "clear_filters" | "open_documents" | "open_ops" | "retry" | "upload";

interface RecommendationState {
  action: RecommendationAction;
  description: string;
  icon: LucideIcon;
  title: string;
  tone: AssetLibraryTone;
}

interface KnowledgeLibraryOverviewProps {
  activeJobCount: number;
  enabledCount: number;
  failedIndexDocumentCount: number;
  failedJobCount: number;
  hasFilters: boolean;
  isError: boolean;
  isLoading: boolean;
  searchableDocumentCount: number;
  selectedDocumentId?: string;
  visibleDocumentCount: number;
  onClearFilters: () => void;
  onOpenDocuments: () => void;
  onOpenOps: () => void;
  onRetry: () => void;
  onUpload: () => void;
}

function getRecommendation(props: KnowledgeLibraryOverviewProps): RecommendationState {
  if (props.isError) {
    return {
      action: "retry",
      description: "The materials list could not be loaded. Reload to try again; your materials and indexing tasks will be preserved.",
      icon: CircleAlert,
      title: "Reload knowledge materials",
      tone: "danger",
    };
  }
  if (props.isLoading) {
    return {
      action: "open_documents",
      description: "Loading material status and indexing results. Guidance will appear when loading is complete.",
      icon: LoaderCircle,
      title: "Loading knowledge materials",
      tone: "neutral",
    };
  }
  if (props.activeJobCount > 0) {
    return {
      action: "open_ops",
      description: `${props.activeJobCount} indexing ${props.activeJobCount === 1 ? "task is" : "tasks are"} running. View their progress. Use fully indexed materials for writing.`,
      icon: RefreshCw,
      title: "View indexing progress",
      tone: "info",
    };
  }
  if (props.failedIndexDocumentCount > 0 || props.failedJobCount > 0) {
    return {
      action: "open_ops",
      description: "Some materials could not be indexed. Review the errors and rebuild their indexes. Other indexed materials remain available for writing.",
      icon: CircleAlert,
      title: "Review indexing issues",
      tone: "warning",
    };
  }
  if (props.visibleDocumentCount === 0 && props.hasFilters) {
    return {
      action: "clear_filters",
      description: "No materials match your search or status filters. Clear the filters to see all materials.",
      icon: SearchCheck,
      title: "Find other knowledge materials",
      tone: "neutral",
    };
  }
  if (props.visibleDocumentCount === 0) {
    return {
      action: "upload",
      description: "Upload a TXT document to make it searchable for book analysis, planning, and writing.",
      icon: Upload,
      title: "Add your first reference material",
      tone: "info",
    };
  }
  if (props.searchableDocumentCount === 0) {
    return {
      action: "open_documents",
      description: "No enabled, fully indexed materials are available. Enable a document or rebuild its index to use it for writing.",
      icon: Database,
      title: "Prepare searchable materials",
      tone: "warning",
    };
  }
  return {
    action: "open_documents",
    description: `${props.searchableDocumentCount} ${props.searchableDocumentCount === 1 ? "document is" : "documents are"} available for retrieval. Review versions, test retrieval, or choose materials for writing.`,
    icon: BookOpenCheck,
    title: "Choose materials for writing",
    tone: "success",
  };
}

export default function KnowledgeLibraryOverview(props: KnowledgeLibraryOverviewProps) {
  const recommendation = getRecommendation(props);
  const documentStatusUnavailable = props.isLoading || props.isError;

  const recommendationAction = (() => {
    switch (recommendation.action) {
      case "upload":
        return (
          <Button type="button" size="sm" onClick={props.onUpload}>
            <Upload className="h-4 w-4" />
            Upload materials
          </Button>
        );
      case "retry":
        return (
          <Button type="button" size="sm" variant="outline" onClick={props.onRetry}>
            <RefreshCw className="h-4 w-4" />
            Reload
          </Button>
        );
      case "clear_filters":
        return (
          <Button type="button" size="sm" variant="outline" onClick={props.onClearFilters}>
            Clear filters
          </Button>
        );
      case "open_ops":
        return (
          <Button type="button" size="sm" variant="outline" onClick={props.onOpenOps}>
            View indexing status
          </Button>
        );
      default:
        if (props.isLoading) {
          return (
            <Button type="button" size="sm" variant="outline" disabled>
              Loading
            </Button>
          );
        }
        return (
          <Button type="button" size="sm" variant="outline" onClick={props.onOpenDocuments}>
            View materials
          </Button>
        );
    }
  })();

  return (
    <>
      <AssetLibraryHeader
        icon={Database}
        context="Creative Assets · Knowledge and Retrieval"
        title="Knowledge Library"
        description="Manage reusable reference materials, check indexing status, and use reliable sources for book analysis, planning, and writing."
        actions={(
          <>
            <Button type="button" onClick={props.onUpload}>
              <Upload className="h-4 w-4" />
              Upload materials
            </Button>
            <OpenInCreativeHubButton
              bindings={{ knowledgeDocumentIds: props.selectedDocumentId ? [props.selectedDocumentId] : [] }}
              label="Send to Creative Hub"
            />
          </>
        )}
      />

      <section aria-label="Knowledge material status" className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl bg-muted/25 px-5 py-3">
        {[
          { label: props.hasFilters ? "Filtered results" : "All materials", value: documentStatusUnavailable ? "—" : props.visibleDocumentCount, dot: "bg-muted-foreground/45" },
          { label: "Enabled", value: documentStatusUnavailable ? "—" : props.enabledCount, dot: "bg-success" },
          { label: "Searchable", value: documentStatusUnavailable ? "—" : props.searchableDocumentCount, dot: "bg-success" },
          { label: "Indexing", value: props.activeJobCount, dot: props.failedJobCount > 0 ? "bg-destructive" : "bg-info" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm">
            <span className={`h-2 w-2 rounded-full ${item.dot}`} aria-hidden="true" />
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-semibold tabular-nums text-foreground">{item.value}</span>
          </div>
        ))}
        {props.failedJobCount > 0 ? (
          <span className="text-xs text-destructive">{props.failedJobCount} indexing {props.failedJobCount === 1 ? "task needs" : "tasks need"} attention</span>
        ) : null}
      </section>

      {recommendation.tone !== "success" ? (
        <AssetLibraryRecommendation
          icon={recommendation.icon}
          title={recommendation.title}
          description={recommendation.description}
          tone={recommendation.tone}
          action={recommendationAction}
        />
      ) : null}
    </>
  );
}
