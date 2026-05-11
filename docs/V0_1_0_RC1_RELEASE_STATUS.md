# Yansilu v0.1.0 RC1 Release Status

Updated: 2026-05-11

## Release Target

Yansilu v0.1.0 RC1 is a Windows desktop beta candidate for local-first testing.

This release candidate is intended for internal or friend testing, not broad production distribution.

## Source

- Local branch: `master`
- Remote baseline: `origin/main`
- App source commit: `87ffb7d Fix release workflow review issues`
- Version: `0.1.0`
- Post-push CI state: no workflow run was triggered for `87ffb7d` because the current workflows run on PRs, manual dispatch, and `v*` tags, not ordinary `main` pushes.

## Build Artifact

- Installer: `apps/desktop/src-tauri/target/release/bundle/nsis/研思录_0.1.0_x64-setup.exe`
- Size: `3,790,884` bytes
- Bundle manifest: `apps/desktop/src-tauri/target/release/bundle/bundle-manifest.json`
- Bundle checksum file: `apps/desktop/src-tauri/target/release/bundle/bundle-manifest.sha256.txt`
- SHA-256: `7BC4A75F90BB63B89C1133D0C277159FC587825A4C5B35678589B1EE76312B50`

## Completed Verification

- `master` was pushed to `origin/main` and verified at `87ffb7d`.
- GitHub Actions inspection found no failed runs for the pushed commit; recent visible Actions runs were earlier PR-triggered successes.
- `npm.cmd run mvp:check` passed on the current release candidate working tree with `146 pass / 0 fail / 55 skipped` in the core suite.
- `npm.cmd run test:e2e:browser:mvp` passed through note, Vault, import, export, graph, and explorer move/delete browser paths.
- Targeted browser E2E passed for default WYSIWYG note mode and source-mode toggling without the Markdown preview panel.
- Unit coverage confirms packaged desktop API placeholder `__API_BASE__` falls back to `http://localhost:3000`.
- Obsidian import preview now normalizes frontmatter hash tags such as `#来源/访谈`.
- Desktop updater permission is granted and checked by `npm.cmd run build:desktop:check`.
- Browser E2E covers the Tauri updater check no-op path when no update is available.
- Windows NSIS build passed from `npm.cmd run build:desktop:nsis` with updater artifacts disabled for this local RC build.
- Bundle manifest and checksum were generated.
- Silent installer smoke passed with exit code `0`.
- Installed executable launched successfully from `%LOCALAPPDATA%\研思录\yansilu-desktop.exe`.
- Launch smoke observed process `yansilu-desktop` with window title `研思录`.
- Installed app window capture confirmed the editor loads as a single WYSIWYG surface by default.
- Installed app editor layout verification passed: editor intent copy is hidden, related clues are hidden by default, and the next-step helper stays collapsed as a small floating pill until hover/focus.
- Installed app WebView2 verification confirmed `已连接 API：http://localhost:3000` with packaged `window.__API_BASE__` still set to `__API_BASE__`.
- Installed app data-flow verification passed: switched to a Chinese/space Vault path, created a directory and note, updated Markdown, uploaded image/file attachments, and read files back from disk.
- Packaged-app API-backed walkthrough passed on 2026-05-10 with `localhost:3000` restarted from the current `feat-desktop-runtime` worktree and active Vault `E:\Projects\Thinking in Notes\yansilu-wt\_manual-walkthrough\研思录 Vault 手动走查`.
- API-backed walkthrough covered Chinese/space custom directories, note persistence, image/file attachments, wikilinks, tags, graph path lookup, Markdown import confirm/history/rollback, Obsidian import confirm/history/asset rollback, Markdown export, writing project creation, and draft scaffold generation.
- Installed app shows a blocking dialog when API is not running, instead of silently falling back to local prototype data.
- Installed app opener actions verified on 2026-05-11: open directory and reveal item both work for Chinese/space paths (uses a custom `open_in_explorer` command to avoid Windows hangs).

## Required Manual Walkthrough Before Sharing

Run this from the installed app, not the dev server:

The API-backed portion of this checklist has passed against the same `localhost:3000` API used by the packaged app. Opener actions have also passed; the remaining sign-off is the human UI pass through the installed WebView (native dialogs, layout, and end-to-end feel).

1. Create or switch to a Vault path with Chinese characters and spaces.
2. Create a directory and a note.
3. Edit and save the note, restart the app, and confirm persistence.
4. Insert an image and a file attachment with Chinese characters and spaces in the file names.
5. Add a `[[wikilink]]` and click a `#tag`.
6. Import a Markdown or Obsidian sample, preview it, confirm it, inspect import history, and test rollback.
7. Export Markdown and confirm files are written to the expected target.
8. Open the graph and jump back from a graph node to the note.
9. Create a writing project from permanent notes and generate a scaffold.
10. Verify desktop opener actions: open directory and reveal Markdown file. (Passed on 2026-05-11)

## Known Limitations

- The Windows installer is unsigned, so Windows SmartScreen may warn during install or first launch.
- RC1 still depends on an external local API service (`http://localhost:3000`) and does not yet ship with an embedded backend.
- Automatic update checks are enabled as best-effort desktop behavior, but production tagged releases still require signing secrets and a populated update feed before updates should be advertised.
- macOS and Linux bundles are CI/build artifacts only until real target-machine smoke tests pass.
- MSI packaging is not the recommended RC1 path.
- Users should back up their local Vault before testing.

## Go / No-Go Rule

RC1 can be shared with testers only after the manual walkthrough completes without P0 issues.

Any issue that blocks launch, Vault switching, note persistence, import/export, attachments, graph navigation, or writing scaffold creation is a P0 and must be fixed before sharing.
