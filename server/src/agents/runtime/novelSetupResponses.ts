import type { CreativeHubNovelSetupStatus } from "@ai-novel/shared/types/creativeHub";

function stageLabel(stage: CreativeHubNovelSetupStatus["stage"]): string {
  switch (stage) {
    case "ready_for_production":
      return "The basics for starting full-book production are in place";
    case "ready_for_planning":
      return "The basics for entering outline planning are in place";
    default:
      return "Still in the setup stage";
  }
}

export function parseNovelSetupStatus(value: unknown): CreativeHubNovelSetupStatus | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.novelId !== "string"
    || typeof record.title !== "string"
    || typeof record.stage !== "string"
    || typeof record.nextQuestion !== "string"
    || typeof record.recommendedAction !== "string"
    || !Array.isArray(record.missingItems)
  ) {
    return null;
  }
  return record as unknown as CreativeHubNovelSetupStatus;
}

export function buildNovelSetupGuidanceFacts(setup: CreativeHubNovelSetupStatus): string {
  const missing = setup.missingItems.slice(0, 5).join(", ");
  const priorityItem = setup.checklist
    .find((item) => item.requiredForProduction && item.status !== "ready")
    ?? setup.checklist.find((item) => item.status !== "ready");
  const currentValue = priorityItem?.currentValue?.trim();
  const lines = [
    `Novel title: ${setup.title}`,
    `Current stage: ${stageLabel(setup.stage)}`,
    `Completion: ${setup.completedCount}/${setup.totalCount} (${setup.completionRatio}%)`,
    `Still missing: ${missing || "none"}`,
    `Fill in first: ${priorityItem?.label ?? "none"}`,
    `Recommended question: ${setup.nextQuestion}`,
    `Recommended action: ${setup.recommendedAction}`,
  ];

  if (currentValue) {
    lines.push(`What this item already has: ${currentValue}`);
  }

  return lines.join("\n");
}

export function formatNovelSetupGuidance(prefix: string, setup: CreativeHubNovelSetupStatus): string {
  const missing = setup.missingItems.slice(0, 3).join(", ");
  const lines = [prefix];

  lines.push(`Current status: ${stageLabel(setup.stage)} (${setup.completedCount}/${setup.totalCount} items ready).`);
  if (missing) {
    lines.push(`Next you still need to fill in ${missing}${setup.missingItems.length > 3 ? ", and more" : ""}.`);
  }
  lines.push(`Let's start with this: ${setup.nextQuestion}`);
  lines.push(`If you have not decided yet, I can also give you a few option sets first.`);

  return lines.join("\n");
}
