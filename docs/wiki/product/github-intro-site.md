# GitHub Pages public intro site

## Background

The project README already carries full feature notes, development history, how to run, and screenshots, but it is a better fit for readers who are already in the repository. A public outreach entry needs to explain three things in a shorter time: what problem this project solves, how the long-novel production chain advances, and whether the visitor should download the desktop app or look at the source next.

The public intro site should therefore be maintained as an independent site, not by deploying the main client home or the README as-is.

## Decision

- The public intro site lives in the `site/` workspace and is built with React + Vite as a pure static artifact.
- The site depends only on existing product screenshots and public download / repository links. It does not connect to the backend and does not read local user data.
- GitHub Pages deployment is owned by `.github/workflows/site-pages.yml`. On push to `main` or a manual trigger it builds `@ai-novel/site` and publishes `site/dist`.
- Visual content prefers real product screenshots and the project social preview image. Do not replace the product UI with abstract illustration.
- Site design direction is defined in `site/DESIGN.md`: “literary editorial office + AI console”. Warm paper carries the creation narrative; a dark console carries product credibility.
- Docs display uses a whitelist manifest. The public entry shows only documents aimed at users and prospective users. It does not automatically expose the whole `docs/` directory.
- Document content is loaded by `site/src/docsContent.ts` with a Vite glob. Public scope is still decided by `site/src/docsManifest.ts`. New public docs must be registered in the manifest and checked with `pnpm check:docs-manifest`.

## Current Rule

The intro site’s primary readers are people seeing the project for the first time. Copy should explain from the user’s point of view:

- How AI Novel Writing Assistant helps a beginner move from one idea to a finished novel.
- How Auto-Director, world / character prep, volume chapter-splitting, chapter execution, and quality repair relate.
- Why a developer can study AI-native product, agent workflow, and a long-form production chain here.
- Source viewing, local Docker / pnpm running, and an optional Windows desktop entry.

## Language Rule

Keep the public surface and the internal maintenance surface in English, with one creative-language exception:

- GitHub README, GitHub About, the intro-site home, navigation, SEO, and the docs chrome (index titles, search, breadcrumbs, pagination) use English.
- `docs/wiki/` internal principles, workflow boundaries, and architecture rules use English. Stored protocol values are English-only.
- This fork's product UI is English; generated novel prose is Georgian (`ka-GE`).
- `docs/public/` user-facing pages are English except the Georgian usage guide.
- The Georgian usage guide lives at `docs/public/georgian-user-guide.md` and must stay registered in the public docs manifest.

The site must not own the internal architecture wiki, execution plans, or checkpoint browser. Detailed development notes stay in the README and docs.

The public docs entry only shows these sources:

- `docs/public/introduction.md`: what the project is, who it is for, core capabilities, the long-form production chain, and download entries.
- `docs/public/installation.md`: Windows install, desktop prep, model connection, and optional Qdrant configuration.
- `docs/public/usage-guide.md`: a first-user guide for install, model setup, creating a novel, and running the main chain.
- `docs/public/georgian-user-guide.md`: Georgian usage notes (Creation / Assets / System).
- `docs/public/faq.md` and `docs/public/troubleshooting.md`: common user questions, task diagnosis, model connection, knowledge-base recall, and data-backup advice.
- `docs/public/modules/`: module introductions aligned with the app sidebar. Each sidebar module has at least one user-facing entry page.
- `docs/public/development-roadmap.md`: the public roadmap, high-level product direction only.
- `docs/releases/release-notes.md`: user-visible update history.

The public docs entry should not show by default:

- `docs/wiki/` internal product principles, workflow boundaries, architecture rules, and Prompt / RAG maintenance rules.
- `docs/archive/` historical archives.
- `docs/checkpoints/` phase checkpoints.
- `docs/plans/` execution plans.
- `TASK.md`, temporary task lists, and unorganized check items.

The reason for this boundary: public-site readers usually want to decide quickly whether the project is worth using or following. The internal wiki is for maintainers and AI agents, and it contains many architecture constraints, failure modes, and development-governance rules. Mixing both into one entry raises new-user cost and also forces internal maintenance docs to do outreach they are not suited for.

## Design Rule

The public intro site does not use generic SaaS card stacks as its main expression. The first screen must state “From one idea to a finished novel” directly, and use real UI as product evidence. Page structure should unfold around the long-form production chain: direction, world / characters, chapter split, prose, repair. Feature capabilities may appear, but they must serve that main line.

Visually, the site should keep two temperaments in balance:

- Literary editorial: serif titles, porcelain-white paper, restrained lines, low-noise typesetting.
- AI console: dark product regions, real screenshots, status, and modular capability notes.

When adding a site page or changing visuals, check `site/DESIGN.md` first so the site does not fall back into an ordinary marketing page.

## Documentation Rule

Public docs should group by user journey: Getting started, Playbooks, Production chain in depth, Module overview, Main writing chain, Knowledge and style, Story assets, Derived workshops, System, Project updates. Do not flatten 20+ modules into one “feature modules” category.

When public docs need to explain Auto-Director, chapter execution, RAG, and recovery, give them separate Playbooks and Production-chain-in-depth categories. Do not compress complex runtime into homepage selling phrases. Production-chain-in-depth docs may cite code stage names, but they must also give the English meaning, the user action, where the artifact lives, and how to recover.

The docs reading page should provide:

- Left-side manifest navigation.
- Local full-text search.
- Breadcrumbs.
- A GitHub source link.
- In-page table of contents and current-heading highlight.
- Previous / next navigation.
- Collapsible TOC for long docs, table styling, and tip / warn / checkpoint callouts.
- SVG/PNG flow diagrams for Auto-Director stages.

These capabilities are not meant to turn the public site into an internal docs system. They lower the cost for a new user to find install, opening a book, recovery, configuration, and module purpose. Public-site search indexes only manifest-registered public docs. It must not index the internal wiki, plans, checkpoints, or archives.

The source anchor for Auto-Director stage docs is `server/src/services/novel/director/projections/novelDirectorProgress.ts`. `DIRECTOR_PROGRESS_ITEM_KEYS` at the top of `docs/public/flow/auto-director-pipeline.md` must cover `DirectorProgressItemKey` in code. `pnpm check:docs-manifest` checks this. When a stage is added, the docs must explain the stage meaning, artifacts, checkpoint / auto-approval behavior, and failure-recovery strategy.

## Routing And Prerender Rule

The public docs site uses History routing. Document paths no longer live in the hash. The user- and search-engine-facing canonical path is `/AI-Novel-Writing-Assistant/docs/<docId>`, and the docs home is `/AI-Novel-Writing-Assistant/docs`. Components, search results, breadcrumbs, pagination, and in-Markdown document links should emit real paths. `#/docs/<docId>` is only a compatibility entry for old links, rewritten to the new path by the home script.

GitHub Pages is still static hosting, so both layers must remain:

- `site/public/404.html` encodes a missing physical-file real path into the query, then returns to home to restore the path.
- The early script in `site/index.html` decodes the 404 query and also accepts old hash document links.

The build must prerender public docs. After the Vite build, `site/scripts/prerender.cjs` walks `docsManifest` and writes complete HTML for the home, the docs home, and every public document. Prerendered HTML must include body, title, description, canonical, and the hashed post-build asset URLs. It cannot leave an empty `#root` for the client to fill.

To support both GitHub Pages and local Vite preview without a trailing slash, non-home routes need both a directory `index.html` and an `.html` copy, for example `dist/docs/introduction/index.html` and `dist/docs/introduction.html`. The sitemap should always use real paths with no hash and no trailing slash.

## Related Modules

- `site/`: public intro-site source and local build notes.
- `.github/workflows/site-pages.yml`: GitHub Pages static deploy flow.
- `images/`: source assets for product screenshots and the GitHub social preview.
- `site/src/docsManifest.ts`: public-docs whitelist.
- `site/src/docsContent.ts`: public-docs content loading.
- `site/src/docsAssets.ts`: public-docs flow-diagram asset loading.
- `site/src/DocsPage.tsx`: docs index and Markdown reading page.
- `scripts/check-docs-manifest.cjs`: public-docs registration check.
- `docs/releases/release-notes.md`: user-visible release history.
