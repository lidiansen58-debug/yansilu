# Yansilu v0.1.0 RC1 Release Status

Updated: 2026-05-09

## Release Target

Yansilu v0.1.0 RC1 is a Windows desktop beta candidate for local-first testing.

This release candidate is intended for internal or friend testing, not broad production distribution.

## Source

- Branch: `master`
- Release baseline: `baseline/workspace-2026-05-09`
- Commit: `222ee09 Stabilize markdown asset links`
- Version: `0.1.0`

## Build Artifact

- Installer: `apps/desktop/src-tauri/target/release/bundle/nsis/研思录_0.1.0_x64-setup.exe`
- Size: `3,787,052` bytes
- Bundle manifest: `apps/desktop/src-tauri/target/release/bundle/bundle-manifest.json`
- Bundle checksum file: `apps/desktop/src-tauri/target/release/bundle/bundle-manifest.sha256.txt`
- SHA-256: `971F9E677C88DAC32F4CFE27CF5387886D327BBD3C5D220437C7142ADC3D9E40`

## Completed Verification

- `npm.cmd run mvp:check` passed on the release baseline.
- Windows NSIS build passed with updater artifacts disabled for this local RC build.
- Bundle manifest and checksum were generated.
- Silent installer smoke passed with exit code `0`.
- Installed executable launched successfully from `%LOCALAPPDATA%\研思录\yansilu-desktop.exe`.
- Launch smoke observed process `yansilu-desktop` with window title `研思录`.

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
- Automatic updates are not advertised for RC1. The app has updater configuration, but the production update feed is not populated and tested yet.
- macOS and Linux bundles are CI/build artifacts only until real target-machine smoke tests pass.
- MSI packaging is not the recommended RC1 path.
- Users should back up their local Vault before testing.

## Go / No-Go Rule

RC1 can be shared with testers only after the manual walkthrough completes without P0 issues.

Any issue that blocks launch, Vault switching, note persistence, import/export, attachments, graph navigation, or writing scaffold creation is a P0 and must be fixed before sharing.
