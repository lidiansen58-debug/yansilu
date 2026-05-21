# Worktree Workflow 2026-05-20

This document records the current default workflow for Yansilu worktrees.

## Main Rules

- `main` lives only in `E:\Projects\Thinking in Notes\yansilu`.
- Do not check out `main` in any other worktree.
- New worktree branches must use one of:
  - `fix/*`
  - `feat/*`
  - `review/*`
  - `spike/*`
- Do not create new `codex/*` or `wt-*` branches for active work.

## Default Worktree Types

- `main`
  - Purpose: coordination, merge, cleanup, final sync.
  - Do not do ordinary feature development here.

- `fix/*`
  - Purpose: one bug, one small scope, one quick merge.
  - Default choice for issue-driven bug fixing.

- `feat/*`
  - Purpose: one user-facing feature or one bounded product slice.
  - Preferred for ordinary issue work.

- `review/*`
  - Purpose: temporary merge validation for a complex branch.
  - Only create when the merge itself needs a clean room.

- `spike/*`
  - Purpose: exploration or risky experiments.
  - Do not merge directly to `main` without reopening the work as `fix/*` or `feat/*`.

## Default Flow

1. Keep `main` clean and updated.
2. Create one `fix/*` or `feat/*` worktree for the issue.
3. Develop and run the smallest relevant tests in that same worktree.
4. Review in the same worktree by default.
5. Merge to `main`.
6. Delete the short-lived worktree after merge.

## When To Create A Separate Review Worktree

Create `review/*` only when at least one of these is true:

- the branch is long-lived and has accumulated many commits
- the merge needs conflict isolation
- final browser/integration validation should happen in a clean directory
- the current development worktree is too noisy to trust for final verification

Otherwise, review in the development worktree.

## Browser E2E Rule

- Browser E2E normally runs in the development worktree, not a temporary review worktree.
- A new worktree may not have local dependencies prepared.
- If browser validation is required in a worktree, check:

```powershell
npm.cmd run wt:deps
npx.cmd playwright --version
```

- `wt:deps` links the current worktree `node_modules` to the primary checkout dependency tree, which is usually enough for local browser E2E when the machine already has Playwright and Chromium installed.

- If the worktree is only for code review and merge validation, prefer diff review and targeted unit/integration tests unless browser E2E is required.

## Safety Rules

- Do not use `git add .` in long-lived worktrees when shared files are in play.
- Stage files explicitly.
- If unrelated changes appear in a worktree, stop and separate them before review or merge.
- If a worktree has already merged back to `main` and has no new target, remove it.

## Recommended Prompt For New Issue Work

```text
From main, create one worktree for this issue.
Use fix/* for a bug or feat/* for a feature.
Do not create a separate review worktree unless the merge is complex.
Run development and the smallest relevant tests in the same worktree.
After review and merge, delete the short-lived worktree.
```
