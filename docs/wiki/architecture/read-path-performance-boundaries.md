# Read-path performance boundaries

## Background

The home page, sidebar, model-selection bootstrap, task-recovery hints, and novel list all load when the user opens the app. If those APIs perform remote probes, state healing, full-detail assembly, or large-list projection while reading, first paint is held by the slowest background capability. After the local SQLite database grows, the same pattern becomes obvious API queuing and blank-page waits.

## Decision

Read paths used by first paint and navigation badges must stay lightweight, cacheable, and low-side-effect. Capabilities that need remote I/O, state healing, model-catalog refresh, recovery initialization, full-detail interpretation, or large-object assembly must move to an explicit user action, a detail page, a background task, or deferred loading.

## Current Rule

- `GET /api/settings/api-keys` returns only locally available vendor configuration status, the current model, enablement, basic model candidates, and image-model configuration. It must not remotely request each vendor's `/models` during first-paint reads. Model-catalog refresh uses a per-vendor `refresh-models` action.
- Auto-Director follow-up overview does lightweight projection and counts only. It must not batch-run `healAutoDirectorTaskState` inside the overview request. State healing belongs to the detail page, background recovery, or an explicit continue action.
- The recovery-candidate list projects summary fields directly from the task table. It must not call task-detail aggregation for every candidate. Recovery initialization runs in the background at startup and must not block HTTP list reads.
- The novel list defaults to paginated list DTOs. List reads are not responsible for automatically healing task state. Task-state healing should be triggered by a detail page, a background coordinator, or an explicit action.
- Badges, recovery hints, and model-configuration bootstrap in the frontend global layout should load in stages, so they do not compete with the current page's primary data for first-paint network and database resources.

## Examples

- Opening the settings page can first show whether a vendor is configured, the current model, and the API address. Remote model catalogs are fetched only when the user clicks "Refresh models".
- When the sidebar only needs task counts and follow-up counts, it must not trigger Auto-Director task healing, chapter scans, or model connectivity probes.
- The recovery entry shows recoverable-task summaries only. The matching recovery-command chain starts after the user clicks recover. Pending-recovery tasks must not auto-open a modal on arbitrary pages and block the current flow. Open details through explicit entrypoints on the novel list, Task Center, or the matching workspace.

## Failure Modes

- If `api-keys` reads slow down to seconds again, first check whether remote model-catalog requests were reintroduced.
- If follow-up overview is consistently hundreds of milliseconds, first check whether the read path batch-heals, queries auto-pass records book by book, or loads large task fields.
- If opening any page fires a large burst of task and model APIs, first check whether `AppLayout`, `Sidebar`, `TaskRecoveryProvider`, and `LLMSelectionBootstrap` bypassed staged loading.

## Related Modules

- `server/src/routes/settings.ts`
- `server/src/services/task/autoDirectorFollowUps/AutoDirectorFollowUpService.ts`
- `server/src/services/task/RecoveryTaskService.ts`
- `server/src/services/novel/novelCoreCrudService.ts`
- `client/src/components/layout/`
- `client/src/pages/novels/NovelList.tsx`
