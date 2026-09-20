# GitHub Pages intro site

This directory is the project’s public intro site. It builds with React + Vite into static files that GitHub Pages can host.

## Local preview

```bash
pnpm --filter @ai-novel/site dev
```

It listens on `http://localhost:4173` by default (kept off the main client’s port 3000, and off other Vite projects’ default 5173).

## Build

```bash
pnpm --filter @ai-novel/site build
```

Output goes to `site/dist`.

## Docs-manifest check

The public docs entry is maintained in `src/docsManifest.ts`. After adding a public doc, run:

```bash
pnpm check:docs-manifest
```

The check scans `docs/public/**/*.md` and `docs/releases/release-notes.md`, confirms every public doc is registered in the manifest, and rejects registrations that point at missing files.

It also reads `DirectorProgressItemKey` from `server/src/services/novel/director/projections/novelDirectorProgress.ts` and confirms that `DIRECTOR_PROGRESS_ITEM_KEYS` at the top of `docs/public/flow/auto-director-pipeline.md` covers every Auto-Director progress stage.

## GitHub Pages

`.github/workflows/site-pages.yml` builds `@ai-novel/site` on push to `main` or on a manual trigger, then publishes `site/dist` to GitHub Pages.

## Docs entry

The site includes a `#/docs` docs entry. Public docs are a whitelist in `src/docsManifest.ts`, limited to user-facing docs under `docs/public/`, sidebar module intros under `docs/public/modules/`, and `docs/releases/release-notes.md`.

Do not mount the whole `docs/` tree on the public site. Internal wiki, `archive`, `checkpoints`, `plans`, and unorganized execution plans stay hidden by default.

Recommended flow for a new module doc:

1. Add a Markdown file under `docs/public/` or `docs/public/modules/`.
2. Register `id`, title, description, and `sourcePath` in `site/src/docsManifest.ts`.
3. If the home page should emphasize the entry, update copy or teasers in `site/src/App.tsx`.
4. Run `pnpm check:docs-manifest`.
5. Run `pnpm --filter @ai-novel/site build`.

`src/docsContent.ts` loads the Markdown with a Vite glob. Do not hand-write an import for each file.
