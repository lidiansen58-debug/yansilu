# Next Step Plan (2026-04-23)

## Goal

Stabilize `spec-main` as a trustworthy baseline, then close the remaining `wt-web-integration` gap for import workflows.

## Current Snapshot

- Automated tests: `44 pass / 0 fail`
- Backend: vault/domain/import/originality/export loop is runnable
- Main gap: web import flow is not yet end-to-end (`preview -> confirm/cancel -> result -> rollback`)
- Process gap: repository has no baseline commit yet (`No commits yet on master`)

## Phase 1: Baseline Freeze (Priority P0)

1. Stage current docs + code and create the first baseline commit on `master`.
2. Treat this commit as the only branch point for new feature worktrees.
3. Keep contract truth in `docs/` and block silent API drift.

Definition of done:

- One baseline commit exists on `master`.
- Worktree creation scripts can branch from that commit.
- `npm test` still reports all passing.

## Phase 2: Web Import Integration (Priority P0)

1. Add import source panel in web prototype.
2. Add import preview call and summary rendering.
3. Add confirm and cancel controls bound to `/api/v1/imports/:id/confirm`.
4. Show blocked/warning/conflict feedback using API payload.
5. Add rollback action bound to `/api/v1/imports/:id/rollback`.
6. Refresh note lists after confirm/rollback.

Definition of done:

- User can complete one full import loop from UI.
- Confirm writes files; cancel writes nothing.
- Rollback removes only untouched created files.

## Phase 3: Regression Safety Net (Priority P1)

1. Add `tests/fixtures/` sample vault/input folders.
2. Add browser-level smoke for import preview/confirm/rollback.
3. Keep an API-level non-destructive write regression test.

Definition of done:

- CI-equivalent local run covers API + browser smoke.
- Failures clearly identify whether backend or web integration regressed.

## Phase 4: Ready for Next Feature Streams (Priority P1)

1. Start index/graph/writing features only after Phase 2 and 3 pass.
2. For each new stream, add contract first, implementation second, tests third.

## Suggested Execution Order

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4