# MVP Alignment Snapshot - 2026-05-09

This note is the current working context for the Yansilu MVP. It separates the release-facing MVP from adjacent planning and experimental work that already exists in the repository.

## Current MVP Scope

The current MVP is a local-first notes and writing workflow:

- Local vault with Markdown files as the user-content source of truth.
- SQLite-backed catalog, tags, links, graph cache, and metadata.
- Directory and note management with real filesystem persistence.
- Three note lanes: fleeting, literature, and permanent/original notes.
- Literature-note paraphrase boundary and permanent-note originality guard.
- Inline `[[wikilink]]`, `#tag`, backlinks, and directory-scoped graph views.
- Markdown and Obsidian import with preview, confirm, history, rollback, and skip reasons.
- Markdown export.
- Writing projects from permanent/original notes, producing a scaffold with evidence mapping, gaps, counterpoints, and open questions.
- Desktop shell for Windows as the first packaged target, with Linux/macOS packaging infrastructure prepared but not yet smoke-tested on those platforms.

## Out Of Current MVP Scope

These may exist as docs, experiments, or early implementation, but they should not expand the release gate for this MVP:

- V1.1 distillation workspace and broader AI suggestion flows.
- Paper workspace and NotebookLM-assisted research workflows.
- Marketing site, auth, billing, checkout, and pricing pages.
- Heavy connector commitments beyond Markdown/Obsidian import and Markdown export.
- Global graph as the default primary graph experience.
- Semantic search, voice input, mobile apps, and collaborative workflows.
- One-click final article generation or auto-saved AI-authored permanent-note prose.

## Implementation Alignment

### Aligned And Verified

- API, web prototype, and local vault run together.
- Note create/edit/save/move/delete works against real Markdown files.
- Directory create/rename/move/delete works against real filesystem paths.
- Custom directory paths are constrained to the active vault.
- Asset uploads insert Markdown links and are served back for preview.
- Asset links are rewritten when notes move across directory depths.
- Directory moves cascade note path updates and asset-link rewrites.
- Import preview/confirm/history/rollback is implemented for Markdown/Obsidian flows.
- Rollback avoids silently deleting user-modified files.
- Originality guard blocks or warns high-risk permanent notes.
- Writing project, scaffold, draft binding, and draft version APIs are implemented.
- Windows desktop build and release executable launch have been verified locally.
- Windows NSIS silent install, silent uninstall, reinstall, and installed executable launch have been verified locally.
- Tauri updater artifacts and runtime updater plugin are disabled for the MVP build until update endpoints and signing are configured.

### Still Needs Final Human Validation

- A focused Windows desktop walkthrough using the packaged executable or installer.
- Native dialog and opener behavior in the actual desktop shell, especially with Chinese paths and paths containing spaces.
- Linux and macOS package smoke tests on real target machines or CI runners.
- A broader real-world Markdown/Obsidian vault import fixture beyond the current test fixtures.

## Current Verification Baseline

Last verified locally on 2026-05-09:

```powershell
npm.cmd test
```

Result:

```text
131 pass / 0 fail / 50 skipped
```

The broader MVP check also passed locally:

```powershell
npm.cmd run mvp:check
```

This includes the core test suite, smoke e2e, quick real-browser MVP e2e, desktop dev preflight, and desktop bundle preflight. The full browser e2e suite remains opt-in with `RUN_BROWSER_E2E=1`.

Additional browser checks verified locally:

```powershell
npm.cmd run test:e2e:browser:mvp
```

Result: passed.

```powershell
$env:RUN_BROWSER_E2E='1'; node --test --test-isolation=none --test-name-pattern "prototype editor inserts uploaded image|prototype editor inserts uploaded file|prototype editor helper can dismiss" .\tests\e2e\prototype-browser.test.mjs
```

Result: 3 pass / 0 fail.

Windows installer smoke verified locally:

```powershell
apps\desktop\src-tauri\target\release\bundle\nsis\研思录_0.1.0_x64-setup.exe /S
```

Result: installer exit code 0; installed app launched from `%LOCALAPPDATA%\研思录\yansilu-desktop.exe` with window title `研思录`.

Current Windows installer artifact:

```text
apps\desktop\src-tauri\target\release\bundle\nsis\研思录_0.1.0_x64-setup.exe
SHA256 E8A9F922A74931253E1A9BF91B51FEE9F2842CC0268EB9E10F1E2522D5B61649
```

Windows uninstall/reinstall smoke verified locally:

```powershell
%LOCALAPPDATA%\研思录\uninstall.exe /S
apps\desktop\src-tauri\target\release\bundle\nsis\研思录_0.1.0_x64-setup.exe /S
```

Result: uninstall exit code 0 and removed install directory, executable, uninstaller, Start Menu shortcut, and uninstall registry entry; reinstall exit code 0 and restored all of them. The reinstalled app launched with window title `研思录`.

Useful MVP commands:

```powershell
npm.cmd run mvp:check
npm.cmd run test:e2e:smoke
npm.cmd run test:e2e:browser:mvp
npm.cmd run dev:desktop:check
npm.cmd run build:desktop:check
npm.cmd run build:desktop
```

## Release Judgment

The current MVP is credible as a runnable local-first MVP and a Windows desktop demo candidate.

It should be treated as a release candidate only after one final desktop walkthrough confirms native path picking, file reveal/open behavior, import/export, graph, writing scaffold, image/file attachments, and path handling for Chinese and space-containing paths.
