import type { AutoDirectorFollowUpListResponse, AutoDirectorFollowUpOverview } from "@ai-novel/shared/types/autoDirectorFollowUp";
import type { AutoDirectorFollowUpSection } from "@ai-novel/shared/types/autoDirectorValidation";
import { TaskQueueSection } from "@/components/taskQueue";
import { workspaceToneSurfaceClass, type WorkspaceTone } from "@/components/workspace";
import { cn } from "@/lib/utils";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

interface OverviewCardConfig {
  section: AutoDirectorFollowUpSection | "";
  label: string;
  description: string;
  count: number;
  tone: WorkspaceTone;
}

interface AutoDirectorFollowUpOverviewCardsProps {
  overview: AutoDirectorFollowUpOverview | null;
  list: AutoDirectorFollowUpListResponse | null;
  activeSection: AutoDirectorFollowUpSection | "";
  onSectionChange: (section: AutoDirectorFollowUpSection | "") => void;
}

export function AutoDirectorFollowUpOverviewCards({
  overview,
  list,
  activeSection,
  onSectionChange,
}: AutoDirectorFollowUpOverviewCardsProps) {
  const counters = list?.countersBySection ?? overview?.countersBySection;
  const reasonCounters = overview?.countersByReason ?? list?.countersByReason;
  const blockingExceptionCount = (reasonCounters?.manual_recovery_required ?? 0)
    + (reasonCounters?.runtime_failed ?? 0);
  const pendingIncludesReplan = (reasonCounters?.replan_required ?? 0) > 0;
  const cards: OverviewCardConfig[] = [
    {
      section: "",
      label: "All",
      description: "View all directing tasks that require follow-up",
      count: overview?.totalCount ?? list?.pagination.total ?? 0,
      tone: "neutral",
    },
    {
      section: "needs_validation",
      label: "Need to verify",
      description: "First confirm whether the tasks and assets are consistent",
      count: counters?.needs_validation ?? 0,
      tone: "danger",
    },
    {
      section: "exception",
      label: "Exception and recovery",
      description: blockingExceptionCount > 0 ? "Failure or manual recovery needs to be dealt with first" : "Canceled records can be restored on demand",
      count: counters?.exception ?? 0,
      tone: blockingExceptionCount > 0 ? "danger" : "neutral",
    },
    {
      section: "pending",
      label: "Pending",
      description: pendingIncludesReplan ? "Contains replanning that must be dealt with first" : "Node requiring confirmation or continuation",
      count: counters?.pending ?? 0,
      tone: pendingIncludesReplan ? "danger" : "info",
    },
    {
      section: "auto_progress",
      label: "automatic advance",
      description: "Ongoing tasks and recent automatic pass records",
      count: counters?.auto_progress ?? 0,
      tone: "info",
    },
    {
      section: "replaced",
      label: "replaced",
      description: "Old tasks taken over by new tasks",
      count: counters?.replaced ?? 0,
      tone: "neutral",
    },
  ];

  return (
    <div className={AUTO_DIRECTOR_MOBILE_CLASSES.followUpOverviewGrid}>
      <TaskQueueSection
        title="Follow up partition"
        description={`${list?.summaryCounters.recoveredToday ?? 0} recovered today and ${list?.summaryCounters.completedToday ?? 0} completed today; blocked, action-required, and automatic work are tracked separately.`}
        className={AUTO_DIRECTOR_MOBILE_CLASSES.followUpOverviewCard}
      >
          <div className={AUTO_DIRECTOR_MOBILE_CLASSES.followUpOverviewSectionGrid}>
            {cards.map((card) => (
              <button
                key={card.section || "all"}
                type="button"
                aria-pressed={activeSection === card.section}
                onClick={() => onSectionChange(card.section)}
                className={cn(
                  "h-full min-w-0 rounded-md border p-3 text-left transition hover:border-primary/50",
                  workspaceToneSurfaceClass[card.tone],
                  activeSection === card.section && "border-primary bg-primary/5",
                )}
              >
                <div className="text-sm font-medium">{card.label}</div>
                <div className="mt-1 text-xl font-semibold leading-none">{card.count}</div>
                <div className={`mt-1 text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
                  {card.description}
                </div>
              </button>
            ))}
          </div>
      </TaskQueueSection>
    </div>
  );
}
