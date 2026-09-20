# English UI maintenance

This fork ships English product copy on `main`. Developer wiki, plans, and other internal docs are also English. The overlay is a shrinking safety net until remaining dual-read aliases and comments are gone.

## Baseline and remotes

- Upstream baseline: `2b9c429830ce07ce76aadd92d7534caafec2b48e`
- `origin`: `https://github.com/gitexadelintershipprod/AI-Novel-Writing-Assistant.git`
- `upstream`: `https://github.com/ExplosiveCoderflome/AI-Novel-Writing-Assistant.git`
- Localization branch: `feature/english-ui`

## Architecture

Product **source copy is English**. New UI, API errors, workflow catalogs, stored protocol values, wiki pages, and other developer docs must be written in English. Do not add Chinese JSX, HTTP messages, or enum literals. Server control strings assembled into LLM context should be English; creative PromptAsset bodies stay Georgian (`language: "ka"`).

The client still initializes i18next as English-only. `EnglishUiBoundary` plus `legacy-ui.json` remain a shrinking safety net for any leftover Han in source. Native `confirm` / `alert` / `Notification` and interpolated templates are not covered by the overlay, so those strings must be English in source.

Stored protocol values (character story function, world type, beat `roleLabel`, Creative Hub thread title, snapshotted task labels) are English on write. A one-time dual-read map in `shared/types/legacyProtocolValues.ts` still accepts legacy Chinese rows. User-authored novel prose, knowledge bodies, and Market Radar scrape titles are not rewritten.

Shared navigation and brand copy use semantic keys in feature-scoped English namespaces. Prefer semantic i18n keys for new UI. Add a dynamic pattern only when source still assembles a bounded legacy sentence at runtime.

The overlay still skips `textarea`, `pre`, `code`, content-editable elements, Plate/ProseMirror editors, and elements marked with `data-preserve-language` or `data-novel-content`. This protects prompts, novel prose, and user-authored content.

Use `data-preserve-language` only around source-owned or user-authored values. Keep surrounding controls, empty-state text, and fallback labels outside that boundary or write those fallbacks directly in English.

Electron startup, splash, updater, failure-dialog, and log-bundle copy comes from `desktop/src/uiMessages.ts`. Runtime state values and IPC contracts remain unchanged.

## Retained Chinese source values

Chinese source text remains only when changing it would alter generation, break dual-read, or describe user/fixture content. Wiki and other developer docs must not keep Chinese prose; quoted dual-read aliases belong in `config/english-docs-allowlist.json`. Client/desktop leftover Han lines have an exact path, text, and reason in `config/english-ui-allowlist.json`. The main classifications are:

- dual-read aliases and legacy protocol map keys;
- AI prompts, templates, and authored content;
- fixtures and contract-test text;
- developer comments;
- leftover source labels still covered by the shrinking presentation overlay;
- Chinese source phrases used as exact keys in the English presentation catalog.

`pnpm check:english-ui` fails when a Han-containing line is added, removed, or changed without updating its classification. It also rejects Chinese values in the English catalog and verifies the fixed English i18n configuration.

After intentionally classifying an upstream change, review it and run:

```bash
pnpm update:english-ui-allowlist
pnpm check:english-ui
```

Do not update the allowlist merely to silence the check. Confirm whether the value is UI copy, a domain value, prompt/content, comment, or fixture first.

The allowlist does not prove that dynamic sentences render fully in English. See [dynamic copy failure modes and regression checks](wiki/debugging/english-ui-dynamic-copy.md), including native confirmation dialogs and count-dependent document previews.

## Updating the presentation catalog

`scripts/generate-english-ui-catalog.cjs` extracts short static source phrases and refreshes `client/src/locales/en/legacy-ui.json`. It uses a network translation service as a draft source. Review changed translations, preserve placeholders, and add high-value wording to `MANUAL_OVERRIDES` before committing.

Never run the generator against user data, private prompts, or novel content. The script is scoped to public repository source files and excludes long or multi-paragraph strings.

## Upstream synchronization

Update `main` only by fast-forward, then merge it into the localization branch:

```bash
git fetch upstream
git checkout main
git merge --ff-only upstream/main
git push origin main
git checkout feature/english-ui
git merge main
git push origin feature/english-ui
```

After every sync, review conflicts and run the complete English UI workflow. Frequent conflict hotspots are shared navigation/layout files, newly added pages and components, `desktop/src/main.ts`, `desktop/src/runtime`, English locale files, the exact allowlist, and `pnpm-lock.yaml`.

## Required verification

```bash
pnpm install --frozen-lockfile
pnpm check:english-ui
pnpm check:english-docs
pnpm typecheck
pnpm lint
pnpm test:all
pnpm build
pnpm build:desktop:all
pnpm verify:desktop-package
```

Windows package verification requires 64-bit and 32-bit Wine plus a virtual X display when run from Linux. The English UI GitHub Actions workflow installs `wine64`, `wine32:i386`, and `xvfb`, then invokes verification through `xvfb-run`.

At the recorded upstream baseline, the server portion of `pnpm test:all` has pre-existing failures outside the localization scope. Keep the command mandatory and visible in CI; do not suppress those failures in the English UI checks. Client tests, English UI policy checks, type checking, linting, and web/desktop builds must still pass before localization changes are accepted.

For manual acceptance, start with empty local storage and repeat with an old language preference present. Visit every main route and inspect forms, menus, dialogs, errors, loading states, empty states, provider setup, generation, RAG, chapter execution, and desktop startup/update flows. Confirm that request and response payloads still carry the original internal values.
