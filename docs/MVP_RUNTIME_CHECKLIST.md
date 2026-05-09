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
  - `npm.cmd test` -> `64 pass / 0 fail / 34 skipped`
  - `RUN_BROWSER_E2E=1 npm.cmd run test:e2e:browser:mvp` -> quick real-browser MVP path
  - `RUN_BROWSER_E2E=1 npm.cmd run test:e2e:browser` -> `34 pass / 0 fail`

## Not Yet Completed

### Desktop shell validation

- Rust toolchain presence and `cargo` availability still need to be confirmed on the target machine.
- Real `npm run dev:desktop` launch has been confirmed on this Windows target machine.
- Real desktop smoke test for dialog/opener permissions on Windows.
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

- Desktop packaging and installer flow.
- One-click open current Vault root from settings.
- E2E coverage for desktop-only Tauri dialog and opener behavior.
- Broader import fixtures for large real-world Markdown/Obsidian vaults.
- CI job that runs browser E2E automatically.
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

The MVP is not yet fully proven as a desktop release candidate because the Tauri shell still needs real-machine integration validation, desktop prerequisite confirmation, and a first full installer/bundle pass.
