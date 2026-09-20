# Desktop version numbers and release identifiers

## Background

The desktop client exposes version information in three places: the current version in the UI header, the Electron package app version, and the GitHub Release tag. If those are maintained separately, user screenshots, installer filenames, and auto-update checks drift apart easily.

## Current Rule

- `desktop/package.json` `version` is the only version source for the desktop client.
- Web-dev frontend reads that version from Vite-injected `VITE_APP_VERSION`. Desktop runtime prefers `appVersion` supplied by the Electron runtime.
- A public release tag must be `vX.Y.Z`, and `X.Y.Z` must equal `desktop/package.json` `version`.
- Do not hard-code another client version in UI, README, or release scripts.
- The GitHub desktop release workflow must use the Node 24 runtime and official Node 24-generation actions. Do not rely on `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` to force older Node 20 actions.
- Desktop update state uses the Electron runtime projection as the only fact source. Workspace header entry, update dialog, startup page, and system settings only present that same state at different density. They must not each infer the update result.
- The workspace header version is the everyday update entry. When a new version is found, downloading, or waiting to restart, the entry must show that state directly. System settings keep full detail but must not be the only entry.
- User-facing update status, error explanations, and action buttons use English. Underlying error details go to the desktop log. Do not dump raw exception strings into the UI.

## Release Steps

1. Before shipping a new desktop package, run `pnpm release:desktop:bump X.Y.Z` to update `desktop/package.json`.
2. Update user-visible release notes and README latest updates with that version's user-facing changes.
3. After merge to `main`, run `node scripts/trigger-desktop-release.cjs --dry-run` and confirm workspace, branch, and tag rules pass.
4. Trigger a public GitHub Release only with a `vX.Y.Z` tag aligned to `desktop/package.json`.

## Failure Modes

- If the UI header version and installer filename disagree, first check `desktop/package.json` on the packaged commit. Do not patch a temporary version into a frontend component.
- If a GitHub Release tag already exists, do not reuse the same version for a new upload. Bump to a new `X.Y.Z`.
- If release notes are updated without bumping the desktop version, auto-update will treat the new package as the old version. Fix the version source before publishing.
- If GitHub Actions reports that an action still uses Node 20, upgrade that action's major version first instead of re-adding a forced runtime env var.

## Related Modules

- `client/vite.config.ts`: injects the desktop version into web-dev and ordinary frontend builds.
- `client/src/lib/constants.ts`: unified export of frontend `APP_VERSION`.
- `client/src/components/layout/desktopUpdaterPresentation.ts`: unified user copy for update status, install shape, and channel.
- `client/src/components/layout/DesktopUpdatePanel.tsx`: update action panel reused by the header dialog and system settings.
- `desktop/src/main.ts`: desktop runtime injects Electron `app.getVersion()` into the renderer.
- `desktop/src/runtime/updater.ts`: fact source for check, download, and install state.
- `scripts/bump-desktop-version.cjs` and `scripts/trigger-desktop-release.cjs`: version bump and public release tag checks.
