# Yansilu v0.1.1-beta.1 Release Status

Updated: 2026-06-17

## Release Target

Yansilu v0.1.1-beta.1 is a Windows desktop beta candidate for small-scope internal or friend testing.

This candidate supersedes the older local v0.1.0 RC artifact and the 2026-05-14 v0.1.1-beta.1 snapshot. Current `main` now includes the simplified import/export scope, the system message inbox, AI model routing, and a substantially improved permanent-note relation workflow.

## Source

- Branch: `main`
- Remote: `origin/main`
- Commit: `0615484 feat: add local ai bootstrap mvp`
- Version: `0.1.1-beta.1`
- Release tag to use after manual sign-off: `v0.1.1-beta.1`

## Build Artifact

- Local archive: `E:\Projects\Thinking in Notes\release-artifacts\v0.1.1-beta.1-current-513ee26-20260617-182837`
- Installer: `研思录_0.1.1-beta.1_x64-setup.exe`
- Size: `4,102,441` bytes
- Bundle manifest: `bundle-manifest.json`
- Bundle checksum file: `bundle-manifest.sha256.txt`
- SHA-256: `0AD39A6B4AECE84A7A09CD5FC0B91CC148FC6657D2FF626CE1818CCDDC3555C0`

Important: this archived installer was built from `513ee26`, before `feat/local-ai-bootstrap` was merged. Rebuild the Windows installer from `0615484` before sharing this beta.

Note: the current manifest checksum file still records the NSIS filename with a mojibake display string from the build manifest generator. The copied artifact filename and installed application path were verified with the correct Chinese name.

## User-Facing Release Notes

### Permanent Note Network

- Isolated permanent notes are now treated as first-class cleanup work instead of passive warnings.
- The graph and permanent note box use clearer isolated-note states and direct relation actions.
- Users can start from an isolated note, ask for possible connections, review candidate reasons, confirm a relationship, and see the note leave the isolated state.
- Existing draft relationships are counted as network participation, while dismissed or archived historical candidates do not block rediscovery.
- Relation creation remains user-confirmed; AI and rules only produce potential links, not automatic formal relationships.

### AI-Assisted Relation Suggestions

- Potential relation discovery now follows a conservative local algorithm: rule-based candidate screening first, AI refinement second, user confirmation last.
- Focused scans keep the current note as the source when `noteId` and scan options are both supplied.
- AI refinement uses the active AI provider settings, so local Ollama and configured remote providers follow the same routing contract.
- Cached AI judgments are invalidated when note content or provider identity changes.
- Timeout and parse failures leave rule-based candidates available instead of blocking the UI.
- Local AI bootstrap now exposes local model catalog and runtime control support so users can check local setup readiness before running AI-heavy note analysis.

### System Messages and AI Review

- AI suggestions, relation reminders, and system prompts are consolidated into the system message inbox.
- Message detail views provide actionable follow-ups, such as creating a missing relation from the related note.
- Stale message detail, action, and busy states have additional safeguards so actions stay bound to the currently selected artifact.

### Editor, Import, and Explorer

- Permanent note editing now keeps relation insertion, wikilinks, and formal relationship data aligned.
- Import handling resolves wikilinks more carefully and avoids title-only ambiguity where path context is available.
- Chinese text, Chinese paths, and paths with spaces were rechecked across import preview, editor display, and installed-app startup.
- Explorer operations for rename, move, delete, reveal, and folder path updates are covered by browser regression tests.

### Desktop Beta Packaging

- Windows NSIS installer build previously passed on `513ee26`; rebuild is required after `0615484`.
- Silent install succeeds.
- Installed app launches with the correct Chinese window title and install directory.
- Updater infrastructure is present, but updater artifacts are disabled for this local beta build.

## Completed Verification

- `node ./scripts/release-validate-tag.mjs v0.1.1-beta.1` passed.
- `npm run build:desktop:check` passed.
- `npm run build:desktop:nsis` passed with `YANSILU_DESKTOP_UPDATER_ARTIFACTS=false`.
- `npm run build:desktop:manifest` passed.
- Silent NSIS install passed with exit code `0`.
- Installed executable exists at `%LOCALAPPDATA%\研思录\yansilu-desktop.exe`.
- Installed app launch smoke passed:
  - Process: `yansilu-desktop`
  - Window title: `研思录`
  - Responding: `True`
- Installed app API smoke passed against a temporary Vault path containing Chinese characters and spaces:
  - API: `http://localhost:3000`
  - Vault: `%TEMP%\yansilu-installed-smoke-a5d13d5440b74f799696c04b31874695 中文 空格`
  - `/api/v1/directories` returned `200` and reported the expected Vault path.
- Graph closeout browser regression passed:
  - `npm run test:e2e:browser:relations-graph-closeout`
  - Result: `6/6` passed.
- AI inbox, isolated reminder, and potential relation targeted tests passed:
  - `npm test -- tests/unit/web-ai-inbox-panel.test.mjs tests/unit/web-ai-inbox-actions-runtime.test.mjs tests/unit/web-ai-inbox-stale-state-runtime.test.mjs tests/unit/web-main-path-isolated-action.test.mjs tests/unit/web-main-path-isolated-relation-action.test.mjs tests/unit/web-note-embedded-ai-workspace.test.mjs tests/unit/api-potential-relations-routing.test.mjs tests/integration/api-potential-relations-refine.test.mjs`
  - Result: `100/100` passed.
- Browser MVP regression passed:
  - `npm run test:e2e:browser:mvp`
- Full browser E2E regression passed:
  - `npm run test:e2e:browser`
  - Result: `61/61` passed.
- Local Ollama smoke passed:
  - `npm run smoke:ai:ollama`
  - Provider: `local_private_gateway`
  - Model: `qwen2.5:7b`
  - Output artifact type: `LinkSuggestion`
- Repository was clean after validation.

## Manual Walkthrough Notes

Manual walkthrough started on 2026-06-17 with a temporary Vault path containing Chinese characters and spaces:

- Web app: `http://localhost:5173/prototype`
- API: `http://localhost:3000`
- Temporary Vault: `%TEMP%\yansilu-manual-验收 Vault 20260617-192335`

Confirmed:

- API and Web app started successfully.
- `/api/v1/directories` returned `200` and reported the Chinese/space-containing Vault path correctly when read through Node.
- Permanent notes can be created in the temporary Vault and opened from the permanent note tree.
- The relation picker opens near the editor toolbar, stays visible inside the viewport, and exposes target search, relation type, and rationale fields.
- A relation can be established from the highlighted search result without an extra explicit click.
- The saved relation preserves the user-selected relation type and rationale, and upgrades the auto-created wikilink edge instead of leaving duplicate edges.
- The relation is written to the relation data:
  - source note sees the target in `outgoingLinks`
  - target note sees the source in `backlinks`
- The graph updates from isolated notes to `3 条永久笔记，1 条关系`; both walkthrough notes show `连接 1 条`.
- The system message panel opens and shows isolated-note / potential-relation reminders with follow-up actions.
- Browser console showed no error or warning entries during the final walkthrough check.

Issues found during manual walkthrough and follow-up status:

1. Fixed: Relation picker target confirmation was too implicit. The highlighted search result can now be submitted directly.
2. Fixed: Relation type and rationale entered in the picker are now preserved in the saved formal relation.
3. Fixed: Toolbar relation insertion no longer prewrites `[[`, so canceling or failing a picker flow does not leave stray wikilink triggers in the editor.
4. Fixed: Worker Vault initialization now retries transient SQLite lock errors. A fresh dev startup was rechecked without `database is locked`.
5. Still open: System message titles remain generic, such as `永久笔记还没有进入图谱`; the detail action works, but the title should surface the affected note name more directly for faster triage.

## Required Before Sharing

Complete one manual walkthrough from the installed desktop app.

The automated data-flow and browser regression coverage has passed. The browser walkthrough relation-picker issues were fixed and rechecked in the browser. The remaining sign-off is the human UI pass through the installed WebView, especially native Windows shell behavior:

1. Use the installed app UI to switch or browse to a Vault path with Chinese characters and spaces.
2. Confirm native path picker dialogs are visible and not hidden behind the main window.
3. Confirm the UI can edit/save a note and still shows the created Vault content after app restart.
4. Verify desktop opener actions from the installed app UI: open directory, reveal Markdown file, open external links, and open attachments.
5. Run one user-level relation workflow from the installed app: isolated permanent note -> request potential connections -> confirm one relation -> verify graph and message state update.

## Known Limitations

- The Windows installer is unsigned, so Windows SmartScreen may warn during install or first launch.
- v0.1.1-beta.1 still depends on an external local API service at `http://localhost:3000`.
- Automatic updater infrastructure is present, but updater artifacts were disabled for this local beta build.
- macOS and Linux builds are not part of this Windows beta sign-off.
- The manifest checksum text currently displays the NSIS filename with mojibake, although the copied installer artifact and installed app path are correct.
- Users should back up their local Vault before testing.

## Go / No-Go Rule

This beta is code-ready for internal testing based on the completed automated and installed-app smoke checks.

Share with testers only after the installed-app manual walkthrough completes without P0 issues.

Any issue that blocks launch, Vault switching, note persistence, import/export, attachments, graph navigation, relation creation, AI relation suggestions, system message actions, or writing scaffold creation is a P0 and must be fixed before broader sharing.
