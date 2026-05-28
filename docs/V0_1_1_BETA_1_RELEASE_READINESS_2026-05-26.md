# Yansilu v0.1.1-beta.1 Release Readiness

Updated: 2026-05-27

## Worktree

- Path: `E:\Projects\Thinking in Notes\yansilu-wt\feat-release-readiness`
- Branch: `feat-release-readiness`
- Lifecycle: `release`
- Theme: `release validation / walkthrough / blocker triage`

## Frozen Release Scope

This worktree is limited to release-close work for the existing `0.1.1-beta.1` Windows desktop beta candidate:

- release validation
- browser walkthrough validation
- packaged-app smoke and walkthrough prep
- blocker triage
- release notes / known issues / checksum / tester instructions

Explicitly not in scope:

- new product feature expansion
- new AI platform capability work
- exploratory adjustments from older long-running branches

## Release Target

- Version: `0.1.1-beta.1`
- Tag under validation: `v0.1.1-beta.1`
- Installer:
  `apps/desktop/src-tauri/target/release/bundle/nsis/研思录_0.1.1-beta.1_x64-setup.exe`
- Installer size: `3,958,695` bytes
- Bundle checksum:
  `174760866E56E5D6161AD00E24A9ADF2C532E23155A4717C45F4F51A95526FCE`
- Checksum file:
  `apps/desktop/src-tauri/target/release/bundle/bundle-manifest.sha256.txt`

## Completed Validation

### Release workflow and build

- `node ./scripts/release-validate-tag.mjs v0.1.1-beta.1` passed.
- `npm.cmd install` completed in the primary checkout so the release worktree can resolve local tooling.
- `npm.cmd run build:desktop:check` passed.
- `npm.cmd run build:desktop:nsis` passed with `YANSILU_DESKTOP_UPDATER_ARTIFACTS=false`.
- `bundle-manifest.json` and `bundle-manifest.sha256.txt` were regenerated from the release worktree.

### Core automated validation

- `npm.cmd test` passed after fixing stale release-facing assertions.
- Current baseline: `998 pass / 0 fail / 137 skipped`.
- `npm.cmd run test:e2e:browser:mvp` passed.
- `npm.cmd run mvp:check` passed end-to-end.

### Browser/manual prep

- Local API launched on `http://localhost:3000`.
- Local web app launched on `http://localhost:5173`.
- Browser verification confirmed:
  - prototype loads successfully
  - API connection badge is visible
  - new note creation renders correctly in the UI
  - Browser MVP release path is green for create/edit/save, Vault initialize, import/export, graph open, explorer move/delete, WYSIWYG blank lines, external links, and wikilink/tag token open behavior

### Packaged-app smoke

- Silent NSIS install passed with exit code `0`.
- Installed executable exists at `%LOCALAPPDATA%\研思录\yansilu-desktop.exe`.
- Installed app launch smoke passed when validated by process name:
  - process: `yansilu-desktop`
  - visible window title: `研思录`
  - responding: `True`

## Open Blockers

### P0

- Final packaged-app human walkthrough is still not signed off.
  - Native dialog visibility, Vault switching, save-after-restart, and opener actions still need manual click-through validation in the installed app.

### P1

- Default repo example Vault currently logs a migration risk on startup:
  - `Migration checksum mismatch for 001_graph_cache_v1_2`
  - observed against: `vault-example/yansilu-vault`
  - impact: local default/dev seed vault is not trustworthy for release validation without switching to a fresh Vault

### P2

- One mixed-asset Browser MVP coverage item is intentionally skipped because it duplicates the dedicated uploaded-image and uploaded-file browser flows.
  - skipped test: `prototype editor can insert image and attachment`
  - judgment: coverage remains in place through the dedicated image and attachment browser tests, but the mixed bootstrap path is flaky enough that it should not block release by itself
- The old launch-smoke command path that tracked only the initial `Start-Process` PID can misread a successful packaged launch as a failure.
  - The installed app stays alive under `yansilu-desktop`, but the launcher PID alone is not sufficient for validation.

## Known Issues

- The Windows installer is unsigned, so SmartScreen warnings are expected.
- The desktop app still depends on an external local API at `http://localhost:3000`.
- Updater artifacts were intentionally disabled for this beta packaging run.
- macOS and Linux remain outside this Windows beta sign-off.
- The repo-shipped example Vault should not be used as the validation baseline until the migration checksum mismatch is resolved or the sample data is refreshed.

## Tester Instructions

1. Start the local API first:
   `node .\apps\api\src\server.mjs`
2. Install:
   `apps/desktop/src-tauri/target/release/bundle/nsis/研思录_0.1.1-beta.1_x64-setup.exe`
3. Expect Windows SmartScreen warnings because the installer is unsigned.
4. Use a fresh Vault, ideally with spaces and Chinese characters in the path.
5. Walk the minimum release path:
   - switch Vault
   - create directory
   - create note
   - edit and save note
   - restart app and confirm persistence
   - insert `[[wikilink]]`
   - click `#tag`
   - import Markdown
   - export Markdown
   - open graph
   - create writing project and scaffold
   - reveal Markdown file
   - open directory in file manager
6. Back up any real local Vault before testing.

## Go / No-Go

Current call: `Close to Go, pending final packaged-app walkthrough.`

Reason:

- core tests are green
- browser MVP validation is green
- desktop packaging is green
- installer smoke is green
- release metadata and checksums are ready
- but the installed-app human walkthrough has not yet completed

Practical judgment:

If the installed desktop UI walkthrough passes without new P0 issues, this candidate is close to a `Go` for limited Windows beta sharing.
