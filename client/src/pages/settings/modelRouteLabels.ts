import type { ModelRouteTaskType } from "@ai-novel/shared/types/novel";

export const MODEL_ROUTE_LABELS: Record<ModelRouteTaskType, { title: string; description: string }> = {
  planner: {
    title: "outline planning",
    description: "First understand the creative goal, and then plan how to proceed with this period of creation.",
  },
  writer: {
    title: "Chief writing",
    description: "Generate chapter text and write out the chapter content completely.",
  },
  review: {
    title: "General review",
    description: "Check plot, pacing, and style to identify quality issues in your draft.",
  },
  light_review: {
    title: "Basic quick review",
    description: "Quickly determine whether a chapter can be advanced and used for lightweight quality checks after the main text.",
  },
  critical_review: {
    title: "Strict review",
    description: "Handles quality checks that affect the continuity of the entire book, suitable for high-risk review and rechecking.",
  },
  repair: {
    title: "Chapter fixes",
    description: "Correct the manuscript according to the review issues and return the chapter to a state where it can be moved forward.",
  },
  replan: {
    title: "Window re-planning",
    description: "When local repair fails to converge, the goals and connections of the affected chapters are rearranged.",
  },
  state_resolution: {
    title: "State analysis",
    description: "Determine whether the chapter status proposal is credible and help automatic directors reduce manual confirmation.",
  },
  summary: {
    title: "Plot summary",
    description: "Organize long chapters into reviews, summaries, and key changes.",
  },
  fact_extraction: {
    title: "Setting testimonials",
    description: "Organize settings, timelines, and key facts to reduce inconsistencies.",
  },
  chat: {
    title: "Inspiration to accompany writing",
    description: "Take everyday conversations and organize the results into content that can be directly understood at the time of creation.",
  },
};
