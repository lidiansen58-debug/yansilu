# Yansilu v0.1.1-beta.1 Release Status

Updated: 2026-05-13

## Release Target

Yansilu v0.1.1-beta.1 is a Windows desktop beta candidate for small-scope internal or friend testing.

This candidate supersedes the older local v0.1.0 RC artifact for tester sharing because `main` now contains additional release, workflow, knowledge-network, AI inbox, and editor-helper changes after the existing `v0.1.0` tag.

## Source

- Branch: `main`
- Remote: `origin/main`
- Commit: `7d1b7cb Prepare v0.1.1 beta release`
- Version: `0.1.1-beta.1`
- Release tag to use after manual sign-off: `v0.1.1-beta.1`

## Build Artifact

- Local archive: `E:\Projects\Thinking in Notes\release-artifacts\v0.1.1-beta.1`
- Installer: `研思录_0.1.1-beta.1_x64-setup.exe`
- Size: `3,860,097` bytes
- Bundle manifest: `bundle-manifest.json`
- Bundle checksum file: `bundle-manifest.sha256.txt`
- SHA-256: `56D3F7D015969DF35AC6F799F28FDC92E5566414F3F45697A9E2992E675F1DC7`

## Completed Verification

- `node ./scripts/release-validate-tag.mjs v0.1.1-beta.1` passed.
- `npm.cmd run build:desktop:check` passed.
- `npm.cmd run build:desktop:nsis` passed with `YANSILU_DESKTOP_UPDATER_ARTIFACTS=false`.
- `npm.cmd run mvp:check` passed after the version bump:
  - Core tests: `316 pass / 0 fail / 67 skipped`
  - Smoke e2e: passed
  - Browser MVP e2e: passed across 10 MVP browser paths
  - Desktop dev preflight: passed
  - Desktop bundle preflight: passed
- Silent NSIS install passed with exit code `0`.
- Installed executable exists at `%LOCALAPPDATA%\研思录\yansilu-desktop.exe`.
- Installed app launch smoke passed:
  - Process: `yansilu-desktop`
  - Window title: `研思录`
  - Responding: `True`

## Required Before Sharing

Complete one manual walkthrough from the installed desktop app:

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
- v0.1.1-beta.1 still depends on an external local API service at `http://localhost:3000`.
- Automatic updater infrastructure is present, but updater artifacts were disabled for this local beta build.
- macOS and Linux builds are not part of this Windows beta sign-off.
- Users should back up their local Vault before testing.

## Go / No-Go Rule

Share this beta only after the installed-app manual walkthrough completes without P0 issues.

Any issue that blocks launch, Vault switching, note persistence, import/export, attachments, graph navigation, or writing scaffold creation is a P0 and must be fixed before sharing.
