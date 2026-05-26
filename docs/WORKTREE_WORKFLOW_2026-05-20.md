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

## Long-Lived Worktree SOP

Use a long-lived development worktree only when the work is a real product stream that will produce multiple small PR batches over time.

Good examples:

- `feat-product-main-path-followup`
- `feat-paper-workspace-followup`
- `feat-ai-platform-followup`

Bad examples:

- one bugfix that should have been `fix/*`
- one review-only branch
- a mixed branch that exists only because cleanup was delayed

### Role

A long-lived worktree is a temporary mother line for one stream. It is not the merge unit.

That means:

- the long-lived worktree may hold the next slice under construction
- the long-lived worktree should not be merged wholesale to `main`
- the normal merge unit is a clean `feat/*-batch` branch cut from current `main`

### Setup

When creating a long-lived worktree:

1. Start from current `main`.
2. Give it one stream theme only.
3. Record the stream and exclusions in `WORKTREE.md`.
4. Keep `main` as the only integration surface.

Recommended stream examples:

- `product main path / graph follow-up / writing-center continuity`
- `paper workspace / translation continuity`
- `AI inbox / review-first platform hardening`

### Operating Rules

1. Do not use `main` for feature work.
2. Do not mix multiple streams in one long-lived worktree.
3. Keep at most one or two not-yet-split themes in the mother line.
4. As soon as a theme can be named as one story, split it into a clean batch branch.
5. Merge batches, not the whole mother line.
6. After one to three merged batches, reassess whether the mother line should be rebuilt from latest `main`.

### Batch Extraction Rule

Cut a clean batch branch when the work can be described in one sentence, for example:

- `refine graph next-action priority`
- `preserve theme index continuity`
- `tighten writing-center continuity`

If you can name it clearly, it should no longer stay only in the long-lived worktree.

### Sync Rule

Before starting a new batch from a long-lived worktree:

```powershell
git fetch origin
git merge main
git status --short --branch
```

If the worktree is already far behind `main`, do not keep building in place. Instead:

1. stop adding new changes
2. split the current slice into a clean batch
3. merge that batch to `main`
4. decide whether to rebuild or retire the old mother line

### Health Checks

Run these checks at least once per new batch:

```powershell
git rev-list --left-right --count main...HEAD
git diff --stat main..HEAD
```

Warning signs:

- the worktree is behind `main` by many commits
- there are no branch-only commits, only a large pile of uncommitted changes
- multiple unrelated themes are mixed together
- the branch repeatedly touches high-conflict files such as:
  - `apps/web/src/prototype-app.js`
  - `apps/web/src/components-editor-pane.js`
  - `apps/web/src/graph-followup.js`
  - `apps/web/src/writing-center-flow.js`

When these signs appear, stop treating the worktree as a healthy long-lived line and switch to cleanup mode.

### Cleanup Mode

Cleanup mode means:

1. pause adding new changes in the old mother line
2. group the remaining work into the smallest clean batch themes
3. move those themes into new batch branches
4. merge the batches to `main`
5. retire or rebuild the old mother line from latest `main`

### Retirement Rule

Retire a long-lived worktree when any of these becomes true:

- all remaining work has already been split into batches
- the branch is mostly a stale base plus local dirty changes
- the current stream is paused for release work
- the branch has produced multiple merged batches and no longer holds a clean next slice

In practice:

- `paper workspace` lines should usually end quickly after the current batch is merged
- `product main path` lines may live longer, but should still be retired and recreated periodically

### Release-Phase Rule

Near release:

- freeze stream scope
- stop adding new exploratory work to the mother line
- merge only the already-defined release batches
- prefer cleanup and validation over further expansion

### Recommended Prompt For A Long-Lived Worktree

```text
Treat this as a long-lived mother line for one stream, not as the direct merge unit.
Keep only one stream theme here.
As soon as the current slice can be named clearly, split it into a clean batch branch from current main.
Merge the clean batch to main, then come back and reassess whether this mother line should continue, be rebuilt, or be retired.
```

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

## Short Prompt Templates

### Product

```text
工作目录：<path>
分支：feat/<name>
目标：<一句话>

只改：<模块/文件>
验证：<最小测试命令>
按 docs/WORKTREE_WORKFLOW_2026-05-20.md 执行。
```

### Bugfix

```text
工作目录：<path>
分支：fix/<name>
目标：修复 <bug>

只改：<文件/模块>
验证：<最小测试命令>
不要扩大范围。
```

### Review

```text
工作目录：<path>
分支：<branch>
目标：判断是否可以合并 main

只看：bug、越界修改、测试缺口
不要继续开发。
```
