# Yansilu v0.1.0 RC1 Release Status

Updated: 2026-05-10

## Release Target

Yansilu v0.1.0 RC1 is a Windows desktop beta candidate for local-first testing.

This release candidate is intended for internal or friend testing, not broad production distribution.

## Source

- Branch: `master`
- Release baseline: `master`
- App source commit: `7ac32cb Desktop: fallback packaged API base`
- Version: `0.1.0`

## Build Artifact

- Installer: `apps/desktop/src-tauri/target/release/bundle/nsis/研思录_0.1.0_x64-setup.exe`
- Size: `3,788,843` bytes
- Bundle manifest: `apps/desktop/src-tauri/target/release/bundle/bundle-manifest.json`
- Bundle checksum file: `apps/desktop/src-tauri/target/release/bundle/bundle-manifest.sha256.txt`
- SHA-256: `BC3CADC6577DE7E916C4E78CC9FDD86C4AA2A52FBB39F00B11901C6218F3F774`

## Completed Verification

- `npm.cmd run mvp:check` passed on the current release candidate working tree.
- Targeted browser E2E passed for default WYSIWYG note mode and source-mode toggling without the Markdown preview panel.
- Unit coverage confirms packaged desktop API placeholder `__API_BASE__` falls back to `http://localhost:3000`.
- Obsidian import preview now normalizes frontmatter hash tags such as `#来源/访谈`.
- Desktop updater permission is granted and checked by `npm.cmd run build:desktop:check`.
- Browser E2E covers the Tauri updater check no-op path when no update is available.
- Windows NSIS build passed with updater artifacts disabled for this local RC build.
- Bundle manifest and checksum were generated.
- Silent installer smoke passed with exit code `0`.
- Installed executable launched successfully from `%LOCALAPPDATA%\研思录\yansilu-desktop.exe`.
- Launch smoke observed process `yansilu-desktop` with window title `研思录`.
- Installed app window capture confirmed the editor loads as a single WYSIWYG surface by default.
- Installed app WebView2 verification confirmed `已连接 API：http://localhost:3000` with packaged `window.__API_BASE__` still set to `__API_BASE__`.
- Installed app data-flow verification passed: switched to a Chinese/space Vault path, created a directory and note, updated Markdown, uploaded image/file attachments, and read files back from disk.

## Required Manual Walkthrough Before Sharing

Run this from the installed app, not the dev server:

1. Create or switch to a Vault path with Chinese characters and spaces.
2. Create a directory and a note.
3. Edit and save the note, restart the app, and confirm persistence.
4. Insert an image and a file attachment with Chinese characters and spaces in the file names.
5. Add a `[[wikilink]]` and click a `#tag`.
6. Import a Markdown or Obsidian sample, preview it, confirm it, inspect import history, and test rollback.
7. Export Markdown and confirm files are written to the expected target.
8. Open the graph and jump back from a graph node to the note.
9. Create a writing project from permanent notes and generate a scaffold.
10. Verify desktop opener actions: open directory and reveal Markdown file.

## Known Limitations

- The Windows installer is unsigned, so Windows SmartScreen may warn during install or first launch.
- Automatic update checks are enabled as best-effort desktop behavior, but production tagged releases still require signing secrets and a populated update feed before updates should be advertised.
- macOS and Linux bundles are CI/build artifacts only until real target-machine smoke tests pass.
- MSI packaging is not the recommended RC1 path.
- Users should back up their local Vault before testing.

## Go / No-Go Rule

RC1 can be shared with testers only after the manual walkthrough completes without P0 issues.

Any issue that blocks launch, Vault switching, note persistence, import/export, attachments, graph navigation, or writing scaffold creation is a P0 and must be fixed before sharing.
