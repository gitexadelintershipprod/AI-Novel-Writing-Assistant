import { featureFlags } from "../../../config/featureFlags.ts";

export type MobilePrimaryNavKey = "home" | "novels" | "creation" | "tasks" | "more";

export interface MobileNavItem {
  key: string;
  label: string;
  to: string;
  group: MobilePrimaryNavKey;
}

export interface MobileNavGroup {
  title: string;
  items: MobileNavItem[];
}

export interface MobileRoutePattern {
  key: string;
  pattern: RegExp;
  title: string;
  group: MobilePrimaryNavKey;
}

export const MOBILE_ROUTE_PATTERNS: MobileRoutePattern[] = [
  { key: "home", pattern: /^\/$/, title: "Home page", group: "home" },
  { key: "help", pattern: /^\/help\/?$/, title: "Creation Wizard", group: "more" },
  { key: "novels", pattern: /^\/novels\/?$/, title: "Novel", group: "novels" },
  { key: "novel-create", pattern: /^\/novels\/create\/?$/, title: "Create a novel", group: "novels" },
  { key: "novel-preview", pattern: /^\/novels\/[^/]+\/preview\/?$/, title: "Novel preview", group: "novels" },
  { key: "novel-edit", pattern: /^\/novels\/[^/]+\/edit\/?$/, title: "Novel workspace", group: "novels" },
  { key: "chapter-edit", pattern: /^\/novels\/[^/]+\/chapters\/[^/]+\/?$/, title: "Chapter text", group: "novels" },
  { key: "drama", pattern: /^\/drama\/?$/, title: "skit", group: "creation" },
  { key: "creative-hub", pattern: /^\/creative-hub\/?$/, title: "creative center", group: "creation" },
  { key: "chat-legacy", pattern: /^\/chat-legacy\/?$/, title: "Old version of chat", group: "creation" },
  { key: "book-analysis", pattern: /^\/book-analysis\/?$/, title: "Open the book", group: "creation" },
  { key: "market-radar", pattern: /^\/market-radar\/?$/, title: "Hot Topic Radar", group: "creation" },
  { key: "tasks", pattern: /^\/tasks\/?$/, title: "Task", group: "tasks" },
  { key: "auto-director-follow-ups", pattern: /^\/auto-director\/follow-ups\/?$/, title: "Director follow up", group: "tasks" },
  { key: "knowledge", pattern: /^\/knowledge\/?$/, title: "Knowledge Base", group: "more" },
  { key: "genres", pattern: /^\/genres\/?$/, title: "Theme base", group: "more" },
  { key: "story-modes", pattern: /^\/story-modes\/?$/, title: "push mode", group: "more" },
  { key: "titles", pattern: /^\/titles\/?$/, title: "title workshop", group: "more" },
  { key: "prompt-workbench", pattern: /^\/prompt-workbench\/?$/, title: "Prompt word management", group: "more" },
  { key: "settings-models", pattern: /^\/settings\/models\/?$/, title: "Models and manufacturers", group: "more" },
  { key: "settings-director", pattern: /^\/settings\/director\/?$/, title: "Auto director settings", group: "more" },
  { key: "settings-knowledge", pattern: /^\/settings\/knowledge\/?$/, title: "Knowledge base and writing methods", group: "more" },
  { key: "settings-maintenance", pattern: /^\/settings\/maintenance\/?$/, title: "Desktop and Maintenance", group: "more" },
  { key: "settings", pattern: /^\/settings\/?$/, title: "Settings", group: "more" },
  { key: "worlds", pattern: /^\/worlds\/?$/, title: "World Sample Library", group: "more" },
  { key: "world-generator", pattern: /^\/worlds\/generator\/?$/, title: "Create a world sample", group: "more" },
  { key: "world-workspace", pattern: /^\/worlds\/[^/]+\/workspace\/?$/, title: "world manual", group: "more" },
  { key: "style-engine", pattern: /^\/style-engine\/?$/, title: "writing engine", group: "more" },
  { key: "anti-ai-rules", pattern: /^\/anti-ai-rules\/?$/, title: "Anti-AI rules", group: "more" },
  { key: "base-characters", pattern: /^\/base-characters\/?$/, title: "Basic role", group: "more" },
];

const primaryNavItems: MobileNavItem[] = [
  { key: "home", label: "Home page", to: "/", group: "home" },
  { key: "novels", label: "Novel", to: "/novels", group: "novels" },
  { key: "creation", label: "create", to: "/creative-hub", group: "creation" },
  { key: "tasks", label: "Task", to: "/tasks", group: "more" },
  { key: "more", label: "More", to: "", group: "more" },
];

const moreNavGroups: MobileNavGroup[] = [
  {
    title: "creative assistance",
    items: [
      { key: "help", label: "Creation Wizard", to: "/help", group: "more" },
      { key: "book-analysis", label: "Open the book", to: "/book-analysis", group: "creation" },
      ...(featureFlags.marketRadarEnabled
        ? [{ key: "market-radar", label: "Hot Topic Radar", to: "/market-radar", group: "creation" as const }]
        : []),
      { key: "chat-legacy", label: "Old version of chat", to: "/chat-legacy", group: "creation" },
    ],
  },
  {
    title: "Asset Library",
    items: [
      { key: "knowledge", label: "Knowledge Base", to: "/knowledge", group: "more" },
      { key: "genres", label: "Theme base", to: "/genres", group: "more" },
      { key: "story-modes", label: "push mode", to: "/story-modes", group: "more" },
      { key: "titles", label: "title workshop", to: "/titles", group: "more" },
      { key: "style-engine", label: "writing engine", to: "/style-engine", group: "more" },
      { key: "anti-ai-rules", label: "Anti-AI rules", to: "/anti-ai-rules", group: "more" },
      { key: "base-characters", label: "Basic role", to: "/base-characters", group: "more" },
    ],
  },
  {
    title: "world and system",
    items: [
      { key: "tasks", label: "Operation record", to: "/tasks", group: "more" },
      { key: "auto-director-follow-ups", label: "Director follow up", to: "/auto-director/follow-ups", group: "more" },
      { key: "worlds", label: "World Sample Library", to: "/worlds", group: "more" },
      { key: "world-generator", label: "Create a world sample", to: "/worlds/generator", group: "more" },
      { key: "prompt-workbench", label: "Prompt word management", to: "/prompt-workbench", group: "more" },
      { key: "settings", label: "Settings", to: "/settings", group: "more" },
    ],
  },
];

export function getMobilePrimaryNavItems(): MobileNavItem[] {
  return primaryNavItems;
}

export function getMobileMoreNavGroups(): MobileNavGroup[] {
  return moreNavGroups;
}

export function getMobileRoutePattern(pathname: string): MobileRoutePattern | undefined {
  return MOBILE_ROUTE_PATTERNS.find((route) => route.pattern.test(pathname));
}

export function getMobilePageTitle(pathname: string): string {
  return getMobileRoutePattern(pathname)?.title ?? "More features";
}

export function getMobileNavGroupForPath(pathname: string): MobilePrimaryNavKey {
  return getMobileRoutePattern(pathname)?.group ?? "more";
}

export function getMobileRouteClassName(pathname: string): string {
  return `mobile-route-${getMobileRoutePattern(pathname)?.key ?? "more"}`;
}
