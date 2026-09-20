# Desktop Plan

> Archive note: This file records the 2026-04-17 early desktop plan and is no longer current development authority. Current desktop release status follows the release notes, `desktop/package.json`, and desktop packaging/install verification scripts.

## 0. Current Progress Sync (2026-04-17)

Desktop work has moved from “pure design” into “dev-mode shell running,” but it has not yet entered “distributable packaging.”

Done:

- The `desktop/` host skeleton is in place. It currently includes `desktop/src/main.ts`, `desktop/src/preload.ts`, `desktop/src/runtime/paths.ts`, and `desktop/src/runtime/server.ts`.
- Frontend runtime can already distinguish `web | desktop`. In desktop mode the host injects the local API base URL; the browser path stays compatible.
- Server core directories have started to abstract by application directory. Database, logs, generated images, and similar no longer depend only on repo-relative paths.
- `pnpm dev:desktop` can already start shared, server, client, and the Electron host in one command in the development environment, and the desktop window has been confirmed to display correctly.
- Native-module missing issues in development have completed a first-round closeout: when `better-sqlite3` is missing a binding, it is auto-filled during development prepare; `electron` is on the allow-list of dependencies that may run build scripts.

Still not done:

- There is still no formal Electron packager configuration, so the current repo cannot directly produce a Windows installer or a portable release package.
- Packaged-mode frontend static-asset organization, server entry, bundled distribution directories, and failure diagnosis are still not closed out.
- First-run wizard, desktop model-config persistence, and default-resource fill UI have not started implementation.

Current conclusion:

- `Phase 0: desktop-ready core` is basically complete.
- `Phase 1: desktop shell dev` has completed the first round of development-mode acceptance.
- `Phase 2: first package MVP` has not started implementation.

## 1. Goal and Positioning

This desktopization is not a product rewrite, and it is not migrating the current Web body into an Electron-only app.

There is only one goal:

- Add a desktop distribution entry of “install and start writing” for beginner users who will not install Node, pnpm, Prisma, a database, and frontend/backend environments.

After desktopization, product form stays:

- The browser side remains the main body and continues to carry daily development, verification, demos, and future online capabilities.
- `desktop/` is only a new host layer, responsible for packaging, startup, default configuration, local directories, install, and updates.
- `client / server / shared` continue as the core business body.

## 2. Success Criteria

After phase one, these must be true:

- The user does not need to install Node, pnpm, or Prisma by hand.
- After install, the user can start the desktop app directly.
- After first open, the user can finish provider selection, API Key configuration, and basic model selection within `3-5` minutes.
- The user does not need to copy `.env` by hand, run Prisma commands, or understand workspace start order.
- The user can run through `install -> first-run wizard -> default resource fill -> AI auto-director start writing`.
- The browser path and source-development path stay available. Desktopization must not reverse-break the Web body.

## 3. Architecture Boundary

### 3.1 Core Principles

- Desktop prefers `Electron`.
- Desktop is attached by adding a `desktop/` package. Do not rewrite the `client / server / shared` main structure.
- The business layer continues on the existing HTTP API. Do not convert existing REST endpoints wholesale into Electron IPC.
- React pages by default do not depend directly on `electron`, `ipcRenderer`, or `window.require`.
- Desktop-only capabilities are exposed through a thin adapter layer. Web keeps an empty or compatible implementation.

### 3.2 Recommended Directories

```text
client/
server/
shared/
desktop/
  src/
    main.ts
    preload.ts
    runtime/
      server.ts
      paths.ts
      config.ts
  scripts/
  build/
```

### 3.3 Runtime Modes

Browser mode:

- `client -> http api -> server`

Desktop mode:

- `Electron -> start local server -> load frontend -> frontend still calls server through http api`

Do not migrate core business in phase one into:

- `React -> IPC -> Electron main -> business logic`

Because that would immediately break Web and desktop staying on the same line.

## 4. Phase-One Scope

Phase one only solves “install and start writing.” Do not chase full desktop features early.

### 4.1 Must Do

- Add a `desktop/` host project.
- Electron can start the local server automatically.
- Electron can load the frontend build output or a local page entry.
- Local SQLite, logs, generated images, and backup directories migrate to the user application directory.
- First-run wizard provides graphical model configuration.
- Default-fill system built-in resources.
- Desktop defaults to turning off the `RAG / Qdrant` dependency chain.
- Provide clear error prompts when startup fails.

### 4.2 Explicitly Not Doing

- Do not rewrite core business logic for desktop.
- Do not turn existing APIs into Electron-only IPC.
- Do not make Qdrant, Embedding, and knowledge-base indexing a desktop first-release hard dependency.
- Do not treat desktopization as “package the current development scripts and still require the user to configure the environment.”

## 5. Prerequisite Refactor Checklist

Before attaching the desktop shell, do the following abstractions first, or later work will keep being redone.

### 5.1 Runtime Config Abstraction

Goal:

- Let Web and desktop use the same frontend business code, but take configuration from different runtime sources.

Implementation items:

- Add a unified runtime identifier: `web | desktop`.
- Abstract the frontend API base-URL source; stop depending only on development-environment inference.
- Keep Web default behavior unchanged.
- Desktop runtime has the host inject the local API address.

Key files:

- `client/src/lib/constants.ts`
- Frontend API initialization entry
- `desktop/src/runtime/config.ts`

### 5.2 Data Directory Abstraction

Goal:

- Avoid continuing to write database, logs, images, and backups into the repo or working directory.

Implementation items:

- Abstract a unified application directory:
  - `appData/data`
  - `appData/logs`
  - `appData/storage/generated-images`
  - `appData/backups`
- Web/source mode keeps the existing relative-path development experience.
- Desktop mode switches to the user application directory.

Key files:

- `server/src/db/prisma.ts`
- `server/src/services/image/imageAssetStorage.ts`
- `server/src/llm/sessionLogFile.ts`

### 5.3 Server Lifecycle Abstraction

Goal:

- Let Electron stably start, probe, and stop the local server.

Implementation items:

- Organize server startup logic into a start entry the desktop host can call.
- Support port probing, health checks, timeout, and failure reporting.
- Avoid adapting only the `pnpm dev` development-script shape.

Key files:

- `server/src/app.ts`
- `desktop/src/runtime/server.ts`

## 6. Phased Implementation Checklist

## Phase 0: desktop-ready core

Goal:

- Do not introduce Electron UI yet. Finish core runtime abstraction first.

Deliver:

- Unified runtime config source.
- Unified application data-directory abstraction.
- Database, log, image, and backup paths can switch by runtime.
- Web development path does not regress.

Acceptance:

- `pnpm typecheck` passes.
- Browser main flow is unaffected.
- A local desktop-simulated runtime can write data into the target user directory.

Current status:

- Basically complete.
- Later only fill packaged-mode path validation and more directory coverage. This phase is no longer treated as the main blocker.

## Phase 1: desktop shell dev

Goal:

- Add the `desktop/` skeleton and run it in the development environment.

Deliver:

- Electron `main/preload` framework.
- Local server start logic.
- Desktop development command, for example `pnpm dev:desktop`.
- Successfully open the frontend in Electron and call the local API.

Acceptance:

- One command starts the desktop shell, server, and frontend together.
- Web mode can still start independently.
- Browser endpoints do not need a parallel implementation for desktop.

Current status:

- First-round development-mode acceptance is complete.
- It is already confirmed that `pnpm dev:desktop` can run shared, server, client, and the Electron host, and a desktop window has displayed successfully on this machine.
- Remaining work in this phase is mainly later closeout around packaged-mode start differences. It is no longer a “can the desktop shell start” question.

## Phase 2: first package MVP

Goal:

- Deliver the first “ordinary user can install” Windows package.

Deliver:

- Windows installer.
- User-directory writes.
- First-run wizard.
- Basic model-config persistence.
- Default resource fill.
- Startup-failure prompts and diagnosis entry.

Acceptance:

- A new machine can start without installing Node.
- The user can finish first-run and start the first book directly.
- With RAG off by default, the main creation chain can run stably.

Current status:

- Not started.
- Currently missing formal packager configuration, bundled resource organization, packaged-mode server entry, and first-run wizard, so it is not yet in a “package and publish directly” condition.

## Phase 3: hardening

Goal:

- Upgrade from installable to maintainable and releasable.

Deliver:

- Auto update.
- Crash recovery and log collection.
- Backup and restore entry.
- Data-directory view and open.
- Version check and upgrade prompt.

Acceptance:

- Common startup failures, port conflicts, and missing configuration all give clear repair guidance.
- The user can finish a backup and see the backup file location.

## 7. Current Backlog Split

### A. Host Layer

- Create the `desktop/` package and build scripts.
- Design `main.ts / preload.ts / runtime/server.ts / runtime/paths.ts`.
- Unify window lifecycle, single instance, and exit logic.

### B. Config and Paths

- Abstract frontend runtime-config injection.
- Abstract server data-directory resolution.
- Abstract log directory and image directory.
- Reserve backup directory and database-copy capability.

### C. First-Run Experience

- First-run welcome page.
- Model provider selection.
- API Key input and validation.
- Basic model selection.
- Resource-fill progress and completion page.

### D. Release and Install

- Windows packaging script.
- Installer configuration.
- App version information and icon resources.
- Release-artifact validation.

### E. Risk Control

- Keep Web and desktop on the same line.
- Ensure desktop does not introduce Electron-invasive frontend dependencies.
- Ensure P0 main-chain development is not interrupted by a desktopization rewrite.

## 8. Risks and Constraints

The main current risk is not “Electron cannot be attached.” It is “existing code and runtime assumptions are too biased toward a source-development environment.”

Known risks:

- Several large files already exceed the project’s preferred size. If later desktopization stacks logic directly, maintenance cost will keep growing.
- Paths for database, logs, and generated images still carry development-time relative-path assumptions.
- The browser side remains the main body. Desktopization must not bind frontend logic to host APIs.
- Desktopization should not crowd out the current `P0` main-chain stability-acceptance cadence.

Matching strategy:

- Do runtime and path abstraction first, then add the desktop shell.
- The host only does host duties and does not carry core business.
- Put desktopization at `P2-A`, advance it on an independent track, and do not interrupt main-chain verification.

## 9. Quality Gate

Before each phase ends, at least check:

- `pnpm typecheck`
- Web-body main-flow regression
- Desktop-mode start regression
- Whether data directories correctly land in the user directory
- Whether the first-run wizard can enter start-writing in the fewest steps

## 10. Milestone Definitions

### M1: desktop-ready core

- Path abstraction complete.
- Runtime-config abstraction complete.
- Web does not regress.

### M2: desktop dev shell

- `desktop/` can start for local development.
- Frontend and local server run through in Electron.

### M3: first installable build

- Windows installer can install, start, and start writing.

### M4: hardening

- Has update, backup, restore, and diagnosis capability.

## This Deliverable

- Made the desktopization boundary of “browser body + desktop host layer” explicit.
- Split desktopization into four phases: prerequisite abstraction, development shell, first installer, and hardening.
- Filled in the current backlog, milestones, acceptance criteria, and risk-control points.
- Made it explicit that phase one only solves “install and start writing,” and does not raise RAG and complex deployment into first-release blockers early.
