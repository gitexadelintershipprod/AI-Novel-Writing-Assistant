export type SiteDocCategory = {
  id: string;
  title: string;
  description: string;
  docs: SiteDocEntry[];
};

export type SiteDocEntry = {
  id: string;
  title: string;
  description: string;
  sourcePath: string;
  githubPath: string;
};

export type FlattenedSiteDocEntry = SiteDocEntry & {
  categoryId: string;
  categoryTitle: string;
};

function doc(
  id: string,
  title: string,
  description: string,
  githubPath: string,
): SiteDocEntry {
  return {
    id,
    title,
    description,
    sourcePath: `../../${githubPath}`,
    githubPath,
  };
}

export const docsManifest: SiteDocCategory[] = [
  {
    id: "getting-started",
    title: "Getting started",
    description: "Install, configure, and walk the first writing path.",
    docs: [
      doc(
        "introduction",
        "Introduction",
        "Who the project is for, what it can finish, and how the novel production chain works.",
        "docs/public/introduction.md",
      ),
      doc(
        "installation",
        "Install and prepare",
        "Install the Windows desktop app and confirm models, storage, and knowledge options.",
        "docs/public/installation.md",
      ),
      doc(
        "georgian-user-guide",
        "Georgian user guide",
        "Georgian walkthrough of Creation, Assets, and System with an English interface.",
        "docs/public/georgian-user-guide.md",
      ),
      doc(
        "faq",
        "FAQ",
        "Fix common model, chapter, and knowledge-library misses.",
        "docs/public/faq.md",
      ),
      doc(
        "troubleshooting",
        "Troubleshooting",
        "Use logs, task status, recovery entry points, and backups to locate problems.",
        "docs/public/troubleshooting.md",
      ),
    ],
  },
  {
    id: "playbooks",
    title: "Playbooks",
    description: "Turn the deep mechanisms into daily steps and recovery paths.",
    docs: [
      doc(
        "first-novel-walkthrough",
        "First novel walkthrough",
        "From an empty project to a finished chapter batch, with the stage and artifact for each step.",
        "docs/public/playbook/first-novel-walkthrough.md",
      ),
      doc(
        "usage-guide",
        "How to use it",
        "Recommended path for model setup, creating a novel, Auto-Director, and chapter execution.",
        "docs/public/usage-guide.md",
      ),
      doc(
        "recovery-by-phase",
        "Recovery by phase",
        "Handle direction, cast, volume planning, chapter split, and execution failures by Auto-Director stage.",
        "docs/public/playbook/recovery-by-phase.md",
      ),
    ],
  },
  {
    id: "production-depth",
    title: "Production chain in depth",
    description: "Understand Auto-Director, chapter execution, RAG, and recovery as one chain.",
    docs: [
      doc(
        "end-to-end-production",
        "End-to-end production chain",
        "A three-layer view of inputs, artifacts, and persistence from idea to chapter execution.",
        "docs/public/flow/end-to-end-production.md",
      ),
      doc(
        "auto-director-pipeline",
        "Auto-Director stage map",
        "Stage-by-stage inputs, artifacts, checkpoints, auto-approval, and recovery strategy.",
        "docs/public/flow/auto-director-pipeline.md",
      ),
      doc(
        "chapter-execution",
        "Chapter execution chain",
        "Draft generation, review, repair, quality debt, and state write-back.",
        "docs/public/flow/chapter-execution.md",
      ),
      doc(
        "knowledge-and-rag",
        "Knowledge and RAG recall",
        "Where the knowledge library, book analysis, style, and world assets are recalled.",
        "docs/public/flow/knowledge-and-rag.md",
      ),
      doc(
        "module-director-follow-up",
        "Director follow-up",
        "See Auto-Director checkpoints, pause reasons, auto-approval, and resume entry points.",
        "docs/public/modules/director-follow-up.md",
      ),
    ],
  },
  {
    id: "module-overview",
    title: "Module overview",
    description: "Understand each home entry and where it should take you next.",
    docs: [
      doc(
        "module-home",
        "Home",
        "Recent writing entry points, task reminders, and jumps into common modules.",
        "docs/public/modules/home.md",
      ),
    ],
  },
  {
    id: "main-chain",
    title: "Main writing chain",
    description: "Open, continue, recover, and finish a novel around task state.",
    docs: [
      doc(
        "module-onboarding",
        "First-run guide",
        "Walk setup, opening, and the first chapter on the first use.",
        "docs/public/modules/onboarding.md",
      ),
      doc(
        "module-novels",
        "Novels",
        "Create, open, manage, and back up your novel projects.",
        "docs/public/modules/novels.md",
      ),
      doc(
        "module-creative-hub",
        "Creative Hub",
        "Describe a goal in conversation, start a task, and read the recommendation.",
        "docs/public/modules/creative-hub.md",
      ),
      doc(
        "module-task-center",
        "Task center",
        "See background progress, failure reasons, and retry options.",
        "docs/public/modules/task-center.md",
      ),
    ],
  },
  {
    id: "knowledge-writing",
    title: "Knowledge and style",
    description: "Turn notes, book analysis, and writing rules into recallable assets.",
    docs: [
      doc(
        "module-knowledge-base",
        "Knowledge library",
        "Store notes, setting, analysis conclusions, and searchable content.",
        "docs/public/modules/knowledge-base.md",
      ),
      doc(
        "module-book-analysis",
        "Book analysis",
        "Analyze a reference work or your own draft and keep the lessons.",
        "docs/public/modules/book-analysis.md",
      ),
      doc(
        "module-style-engine",
        "Style engine",
        "Maintain narrative style, sample text, and writing rules.",
        "docs/public/modules/style-engine.md",
      ),
      doc(
        "module-anti-ai-rules",
        "Anti-AI rules",
        "Reduce template tone, explanation padding, and empty phrasing in prose.",
        "docs/public/modules/anti-ai-rules.md",
      ),
    ],
  },
  {
    id: "story-assets",
    title: "Story assets",
    description: "Maintain genre, story mode, characters, world samples, and titles.",
    docs: [
      doc(
        "module-genre-base-library",
        "Genre library",
        "Keep genre direction, reader expectation, and type selling points.",
        "docs/public/modules/genre-base-library.md",
      ),
      doc(
        "module-progression-mode-library",
        "Story mode library",
        "Manage how the story advances and how reader payoffs are delivered.",
        "docs/public/modules/progression-mode-library.md",
      ),
      doc(
        "module-character-library",
        "Character library",
        "Maintain reusable characters and base visual assets.",
        "docs/public/modules/character-library.md",
      ),
      doc(
        "module-world-sample-library",
        "World sample library",
        "Save and reuse world samples.",
        "docs/public/modules/world-sample-library.md",
      ),
      doc(
        "module-title-workshop",
        "Title studio",
        "Generate, filter, and refine book or chapter titles.",
        "docs/public/modules/title-workshop.md",
      ),
    ],
  },
  {
    id: "derived-workshops",
    title: "Derived workshops",
    description: "Extend novel material into short-drama or comic production assets.",
    docs: [
      doc(
        "module-short-drama-workspace",
        "Drama studio",
        "The entry for extending novel content toward short drama.",
        "docs/public/modules/short-drama-workspace.md",
      ),
      doc(
        "module-comic-workspace",
        "Comic studio",
        "Prepare comic panels and visual assets from novel content.",
        "docs/public/modules/comic-workspace.md",
      ),
    ],
  },
  {
    id: "system",
    title: "System",
    description: "Manage model providers, task routing, prompts, and runtime preferences.",
    docs: [
      doc(
        "module-system-settings",
        "Settings",
        "Configure providers, API keys, the knowledge library, and basic preferences.",
        "docs/public/modules/system-settings.md",
      ),
      doc(
        "module-model-routing",
        "Model routing",
        "Assign models to planning, prose, review, and related tasks.",
        "docs/public/modules/model-routing.md",
      ),
      doc(
        "module-prompt-management",
        "Prompt management",
        "Inspect and maintain the prompt assets used by AI tasks.",
        "docs/public/modules/prompt-management.md",
      ),
    ],
  },
  {
    id: "project-updates",
    title: "Project updates",
    description: "Public roadmap and user-visible update history.",
    docs: [
      doc(
        "development-roadmap",
        "Public roadmap",
        "Near-term, mid-term, and longer product direction.",
        "docs/public/development-roadmap.md",
      ),
      doc(
        "release-notes",
        "Release notes",
        "Complete user-visible update history.",
        "docs/releases/release-notes.md",
      ),
    ],
  },
];

export const flattenedDocs: FlattenedSiteDocEntry[] = docsManifest.flatMap((category) =>
  category.docs.map((doc) => ({ ...doc, categoryId: category.id, categoryTitle: category.title })),
);
