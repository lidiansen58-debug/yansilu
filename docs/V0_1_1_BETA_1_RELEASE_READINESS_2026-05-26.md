# Yansilu v0.1.1-beta.1 Release Readiness

Updated: 2026-06-06

## Worktree

- Path: `E:\Projects\Thinking in Notes\yansilu-wt\feat-release-readiness`
- Branch: `feat-release-readiness`
- Lifecycle: `release`
- Theme: `release validation / walkthrough / blocker triage`

## Frozen Release Scope

This worktree remains limited to release-close work for the existing `0.1.1-beta.1` Windows desktop beta candidate:

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
- Installer size: `4,015,877` bytes
- Bundle checksum:
  `CCD2F841B1485BD38C2B44AB934A47910B25827C25CF121C499FB8E89057EC73`
- Checksum file:
  `apps/desktop/src-tauri/target/release/bundle/bundle-manifest.sha256.txt`

## Completed Validation

### Release workflow and build

- `npm.cmd run release:validate -- v0.1.1-beta.1` passed.
- `npm.cmd run build:desktop:check` passed.
- `npm.cmd run build:desktop:nsis` passed with `YANSILU_DESKTOP_UPDATER_ARTIFACTS=false`.
- `bundle-manifest.json` and `bundle-manifest.sha256.txt` were regenerated from the release worktree.

### Core automated validation

- `npm.cmd test` passed after updating stale release-facing assertions.
- Current baseline: `1134 pass / 0 fail / 138 skipped`.
- `npm.cmd run test:e2e:browser:mvp` passed.
- `npm.cmd run mvp:check` passed end-to-end.
- Targeted release-regression checks also passed for:
  - `tests/unit/api-ai-suggestion-reject-runtime.test.mjs`
  - `tests/e2e/prototype-browser.test.mjs` import flows
  - `tests/unit/yijing-rich-acceptance-fixture.test.mjs`

### Browser/manual validation

- Local API and web app were reachable at:
  - `http://localhost:3000`
  - `http://localhost:5173`
- In-browser walkthrough confirmed:
  - marketing home loads normally
  - `prototype?demo=smart-notes-product-thinking` loads successfully
  - left-rail graph entry opens the graph workspace
  - graph summary renders demo data correctly:
    `102 条永久笔记 · 167 条关系 · 先看有解释力的关系。`
  - relation-type filter is directly visible in the graph toolbar as a native dropdown:
    `#graphRelationTypeFilter`
- Browser MVP release path is green for:
  - create/edit/save
  - Vault initialize
  - import/export
  - graph open
  - explorer move/delete
  - WYSIWYG blank lines
  - external links
  - wikilink/tag token open behavior

### Packaged-app smoke

- Silent NSIS install passed with exit code `0`.
- Installed executable exists at:
  `%LOCALAPPDATA%\研思录\yansilu-desktop.exe`
- Installed app launch smoke passed:
  - process: `yansilu-desktop`
  - visible window title: `研思录`
  - responding: `True`

### Cleared from prior run

- The previous example-Vault migration concern no longer reproduces.
  - `applySqliteMigrations('./vault-example/yansilu-vault')` completed successfully on `2026-06-06`.
  - `001_graph_cache_v1_2` was accepted and skipped as expected.

## Open Blockers

### P0

- Final packaged-app human walkthrough is still not signed off.
  - Native dialog visibility, Vault switching, save-after-restart, and opener actions still need manual click-through validation in the installed app.

### P1

- None from this rerun.

### P2

- None that currently block beta packaging or release validation.

## Known Issues

- The Windows installer is unsigned, so SmartScreen warnings are expected.
- The desktop app still depends on an external local API at `http://localhost:3000`.
- Updater artifacts were intentionally disabled for this beta packaging run.
- macOS and Linux remain outside this Windows beta sign-off.

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
   - confirm relation filter dropdown is visible in the graph toolbar
   - create writing project and scaffold
   - reveal Markdown file
   - open directory in file manager
6. Back up any real local Vault before testing.

## Go / No-Go

Current call: `Close to Go, pending final packaged-app walkthrough.`

Reason:

- release validation workflow is green
- desktop packaging is green
- checksum and installer metadata are ready
- browser MVP is green
- browser manual spot-check is green
- example-Vault migration concern from the previous run is cleared
- but the installed desktop UI walkthrough is still pending human sign-off

Practical judgment:

If the installed desktop UI walkthrough passes without a new P0 finding, this candidate is close to a `Go` for limited Windows beta sharing.
