# MVP Runtime Checklist

## Goal

This checklist tracks what is already runnable in the first Yansilu MVP and what is still missing before the desktop app can be treated as a real end-to-end runnable build.

## Completed

### Core data and storage

- Vault layout initialization with default directories.
- Markdown as the main user-content source.
- SQLite catalog, graph cache, and vector DB bootstrap.
- Directory metadata persistence.
- Note catalog persistence with stable `note_id`.
- Note create, update, move, and delete flows.
- Directory create, rename, move, hide, and delete flows.
- Directory fsPath move now cascades to descendant directories and Markdown note paths.
- Custom directory fsPath values are constrained to the active vault root.
- Note and directory moves rewrite relative Markdown asset links when the note path depth changes.
- Directory delete keeps the catalog record if filesystem cleanup fails.

### Web prototype + real API wiring

- Explorer tree wired to real directories and notes.
- Multi-tab Markdown editor wired to real note save.
- Dirty markers, save hint, Ctrl/Cmd+S, autosave draft, restore draft.
- Inline `[[` candidate search and insertion.
- Tag click search backed by SQLite query API.
- Graph panel backed by real directory graph API.
- Writing panel backed by real writing project + scaffold API.
- Settings panel backed by real Vault read/switch API.
- Import preview/confirm/cancel/rollback wired to real APIs.
- Markdown export wired to real API.

### File-manager-like interaction

- New directory with local fsPath.
- New note in selected directory.
- Directory right-click rename.
- Directory drag-and-drop move.
- Directory right-click set save path.
- Note right-click rename.
- Note right-click move.
- Note right-click delete.
- Show Markdown file location.
- Show directory location.

### Desktop shell preparation already in place

- Project-level desktop preflight command `npm run dev:desktop:check` is available.
- Project-level desktop bundle preflight command `npm run build:desktop:check` is available.
- `npm run dev:desktop` has launched successfully on the current Windows machine.
- `npm run build:desktop` has produced a Windows NSIS installer on the current Windows machine.
- The release executable has launched successfully on the current Windows machine.
- The Windows NSIS installer has completed a local silent install with exit code 0.
- The installed Windows app has completed a local silent uninstall and reinstall cycle with exit code 0.
- The installed executable at `%LOCALAPPDATA%\研思录\yansilu-desktop.exe` has launched successfully with the `研思录` window title.
- Desktop app checks for updates (best-effort) when running inside Tauri; v0.1.0 tagged bundles keep updater artifacts disabled until signing secrets and a working update feed are ready.
- Tauri dialog/opener UI branches now have automated coverage for:
  - Vault browse fallback path picking
  - reveal current Markdown file through desktop opener
- Browser-side command wiring is already unified for:
  - choose directory
  - reveal current Markdown file
  - open directory in file manager
  - switch active Vault

### Test coverage already passing

- Unit and integration coverage for domain, connectors, originality guard, export, writing, and API routes.
- Browser E2E coverage for:
  - note create/edit/save
  - dirty state and shortcut save
  - inline wikilink insertion
  - draft restore
  - tag search
  - vault switching
  - directory create
  - directory rename
  - directory drag-and-drop move
  - directory set save path
  - note rename
  - note move
  - note delete
  - import/export/writing/graph flows
- Current verified test baselines:
  - `npm.cmd test` -> `161 pass / 0 fail / 59 skipped`
  - `npm.cmd run mvp:check` -> core tests, smoke e2e, quick real-browser MVP e2e, desktop dev preflight, and desktop bundle preflight passed locally on 2026-05-11.
  - `npm.cmd run test:e2e:browser:mvp` -> quick real-browser MVP path passed locally for note, Vault, import, export, graph, and explorer move/delete paths.
  - Targeted browser regression for import/export after the asset-flow merge -> `7 pass / 0 fail`
  - Marketing route coverage for `/about`, `/privacy`, `/terms`, `/login`, `/register`, `/billing`, auth/billing DOM hooks, and asset-proxy HTML refusal -> `2 pass / 0 fail`
  - `npm.cmd run build:desktop:nsis` -> produced `apps/desktop/src-tauri/target/release/bundle/nsis/研思录_0.1.0_x64-setup.exe` with SHA-256 `B4A6B11A0BAC93F209A25E8191C3D1D8B9C5A98EDCB058F6F2114C6DE380A030`.
  - `RUN_BROWSER_E2E=1 npm.cmd run test:e2e:browser` -> full browser prototype flow has passed locally with `59 pass / 0 fail`

## Not Yet Completed

### Desktop shell validation

- Rust toolchain presence and `cargo` availability must still be confirmed on every target machine.
- Real desktop smoke test for dialog/opener permissions still needs one final packaged-app walkthrough on Windows.
- Real desktop smoke test for macOS.
- Real desktop smoke test for Linux.
- MSI bundle path still needs a stable WiX tool download/cache flow in this environment.

### Desktop integration polish

- Unified desktop menu / command entry for:
  - open directory in file manager
  - reveal current Markdown file
  - choose directory
  - choose and switch Vault
- Better desktop-specific failure messages for missing permissions / blocked fs operations.
- Confirmed behavior when chosen fsPath already exists and contains files.

### MVP product gaps still open

- Final Windows packaged-app walkthrough.
- One-click open current Vault root from settings.
- E2E coverage for desktop-only Tauri dialog and opener behavior.
- Broader import fixtures for large real-world Markdown/Obsidian vaults.
- CI job that runs browser E2E automatically.
- CI currently does not run on ordinary `main` pushes; desktop workflows run on PRs, manual dispatch, and `v*` tags.
- Full browser E2E should be split or budgeted before CI because the one-shot local run exceeded the current 10-minute shell timeout.
- A final human walkthrough of the cleaned-up note/import/graph/writing workspaces.

## Desktop-shell integration items before calling MVP "desktop-runnable"

1. Install and verify Rust + Tauri desktop prerequisites on the target machine:
   - `rustc --version`
   - `cargo --version`
   - `npm run dev:desktop:check`
2. Run `npm run dev:desktop` successfully on a machine with Rust + Tauri toolchain.
3. Verify Tauri dialog plugin can browse for:
   - new directory path
   - directory save path
   - Vault path
4. Verify opener plugin can:
   - reveal folder in file manager
   - reveal Markdown file in file manager
5. Verify file operations against the real desktop shell:
   - rename directory
   - move directory
   - set directory save path
   - move note
   - delete note
6. Verify Windows-specific UX:
   - prompts do not get hidden behind the main window
   - file manager opens in the expected folder
   - paths with spaces and Chinese characters behave correctly
7. Run `npm run build:desktop:check` before any installer or bundle attempt.
8. After desktop validation passes, run one human MVP walkthrough:
   - create directory
   - create note
   - edit/save note
   - link note with `[[...]]`
   - search/click `#tag`
   - import Markdown
   - open graph
   - create writing project and scaffold

## Current judgment

The MVP is already runnable as:

- real API service
- real local vault + Markdown storage
- real browser prototype against the API
- Windows desktop demo build

The MVP is close to a Windows desktop release candidate. The remaining proof is a final packaged-app walkthrough that confirms native path picking, file reveal/open behavior, import/export, graph, writing scaffold, image/file attachments, and Chinese/space-containing paths.
