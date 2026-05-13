# V1.5 Implementation Baseline - 2026-05-13

## Goal

Record the implementation state for V1.5 P0 before broader AI-candidate, understanding-check, or index-card gap UI work.

V1.5 P0 focuses on:

1. Deriving thinking status from existing note, index card, and writing project fields.
2. Returning that status through existing domain/API responses.
3. Preserving the V1 flow while preparing for later confirmation and candidate semantics.
4. Showing status lightly in the existing prototype without turning it into a blocking workflow.

## Repository State

- Repo: `E:\Projects\Thinking in Notes\yansilu`
- Branch: `main`
- Root workspace is not a git repo.
- Known pre-existing untracked file: `docs/V0_1_RELEASE_NOTES.md`

Current V1.5 P0 implementation files:

- `apps/web/src/components-editor-pane.js`
- `apps/web/src/components-explorer-pane.js`
- `apps/web/src/prototype-app.js`
- `apps/web/src/prototype.html`
- `docs/UI_PROTOTYPE_P0.md`
- `packages/domain/src/thinking-status.mjs`
- `packages/domain/src/index.mjs`
- `packages/domain/src/note-catalog-store.mjs`
- `packages/domain/src/index-card-store.mjs`
- `packages/writing-engine/src/writing-engine.mjs`
- `tests/e2e/prototype-browser.test.mjs`
- `tests/unit/thinking-status.test.mjs`
- `tests/integration/api-notes.test.mjs`
- `tests/integration/api-writing.test.mjs`

## Existing Support Reused

- Permanent notes already support `thesis`, `three_line_summary`, `distillation_status`, and `boundary_or_counterpoint`.
- Index cards already support `thesis`, `three_line_summary`, and `central_question`.
- Writing projects already support `intent`, `desired_reader_takeaway`, basket note ids, and scaffold ids.
- Draft scaffolds already expose `gaps`, `counterpoints`, and `open_questions`.

## Implemented In This Slice

- Added pure thinking-status derivation helpers:
  - `deriveNoteThinkingStatus`
  - `deriveIndexCardThinkingStatus`
  - `deriveWritingProjectThinkingStatus`
- Exported thinking-status helpers from the domain package.
- Attached `thinkingStatus` to:
  - note create/update/detail responses
  - note directory list responses
  - index card create/list/detail/update responses
  - writing project create/list/detail responses
  - scaffold response `writing_project`
- Added unit tests for derivation rules.
- Added integration assertions for API responses.
- Hardened confirmed distillation semantics:
  - direct `distillationStatus: "confirmed"` requests are rejected unless the request carries explicit user authorship confirmation
  - current P0 confirmation signal reuses `authorshipConfirmed: true` or `authorship.user_confirmed: true`
  - unconfirmed create/update attempts now return `PERMANENT_DISTILLATION_CONFIRMATION_REQUIRED`
  - existing confirmed test flows were updated to include explicit user confirmation
- Surfaced `thinkingStatus` lightly in the existing prototype UI:
  - note tree rows show compact status badges
  - editor header shows the active note status and next action
  - writing note, theme-index, and project cards show status badges
  - switching editor tabs syncs the left navigation to the active note root, folder expansion, and active row

## Current Behavior Notes

- `thinkingStatus` is derived, not persisted.
- `thinkingStatus` uses user-facing Chinese labels such as `待写论点`, `待压缩`, `待加入主题`, and `可进入写作`.
- Confirmed distillation semantics are now hardened for note create/update payloads.
- The web prototype renders status as a quiet hint rather than as a required step.
- Field-level AI candidate persistence has not been implemented.
- Understanding checks, follow-up prompts, index-card gap persistence, and home-page "continue thinking" UI are not implemented in this slice.

## Validation Run

Commands run from `E:\Projects\Thinking in Notes\yansilu`:

```powershell
node --test .\tests\unit\thinking-status.test.mjs
node --test .\tests\integration\api-notes.test.mjs .\tests\integration\api-writing.test.mjs
node --test .\tests\unit\thinking-status.test.mjs .\tests\integration\api-notes.test.mjs .\tests\integration\api-writing.test.mjs
node --test .\tests\unit\paper-workspace-store.test.mjs .\tests\integration\api-paper-workspace.test.mjs .\tests\unit\core-vault.test.mjs
$env:RUN_BROWSER_E2E='1'; node --test --test-isolation=none .\tests\e2e\prototype-browser.test.mjs
npm.cmd test
```

Results:

- `thinking-status.test.mjs`: 4/4 passed.
- `api-notes.test.mjs` + `api-writing.test.mjs`: 11/11 passed.
- Focused combined run: 15/15 passed.
- Adjacent paper/core-vault run: 17/17 passed.
- Browser e2e with `RUN_BROWSER_E2E=1`: 67/67 passed.
- Full `npm.cmd test`: 338 total, 271 passed, 67 skipped, 0 failed.
- Manual Browser QA on current-repo dev services:
  - API `http://localhost:3101`
  - Web `http://localhost:5188/prototype`
  - Temp vault `%TEMP%\yansilu-prototype-qa\vault-3101`
  - Verified page identity, nonblank render, no console errors, note-tree/editor `thinkingStatus`, and note selection interaction.

## Next Implementation Step

Recommended next step is E5 from `V1_5_P0_ENGINEERING_BACKLOG_2026-05-13.md`:

1. Add a narrow candidate/suggestion status-transition model.
2. Cover allowed transitions such as `suggested -> adopted_as_draft`, `suggested -> rejected`, `adopted_as_draft -> edited`, and `edited -> confirmed`.
3. Forbid direct `suggested -> confirmed`.
4. Keep the slice pure/test-first; no real AI generation, heavy UI, or persistence is required for P0 unless the implementation naturally needs it.

## Risks

- Derived status for note lists reads Markdown for permanent/literature notes. This is acceptable for P0 but may need optimization if list size grows.
- The status derivation is intentionally conservative and may need copy refinement after UI testing.
- Generated/sample vault DB files are dirty under `vault-example/yansilu-vault/.yansilu`; do not stage or clean them unless requested.
- Do not introduce AI generation or persistence before candidate confirmation semantics are tested.
