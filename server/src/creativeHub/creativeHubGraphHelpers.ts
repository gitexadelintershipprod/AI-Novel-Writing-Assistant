import type { CreativeHubMessage, CreativeHubThread } from "@ai-novel/shared/types/creativeHub";

export function latestHumanGoal(messages: CreativeHubMessage[]): string {
  const latestHuman = [...messages].reverse().find((item) => item.type === "human");
  if (typeof latestHuman?.content === "string" && latestHuman.content.trim()) {
    return latestHuman.content.trim();
  }
  return "Continue the current Creative Hub task.";
}

export function toRunStatusContext(status: CreativeHubThread["status"], latestError: string | null) {
  return {
    threadStatus: status,
    latestError,
  };
}
