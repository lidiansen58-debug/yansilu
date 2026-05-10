# Worktree Guide

## Current Baseline

The current post-cleanup directory ownership and thread mapping is recorded in `docs/WORKTREE_OWNERSHIP_2026-05-10.md`.

That baseline supersedes the older long-lived feature-branch convention in this guide: keep reusable directories, but start new short-lived branches from current `master` when a new thread begins work.

## Goal

This guide defines a practical worktree split for the current Yansilu monorepo so feature work, release work, and QA work can move in parallel without turning every merge into a cross-cutting integration event.

The project is now large enough that "one tree per task" is no longer efficient by default. The better default is:

- keep a small number of long-lived worktrees
- split by product stream, not by random ticket
- use the main checkout as the only integration and release surface

## Default Topology

Keep these workspaces by default:

| Workspace | Role | Main Scope |
|---|---|---|
| `mainline` | integration and release | merge, regression, release candidate |
| `wt-core-workflow` | note-taking and writing workflow | explorer, editor, graph, writing |
| `wt-import-pipeline` | import and rollback flow | connectors, markdown engine, import UI |
| `wt-desktop-release` | desktop shell and packaging | Tauri shell, native file actions, installers |
| `wt-growth-site` | marketing, auth, billing | landing pages, login/register, pricing, Stripe |

Open an additional `wt-qa-hardening` only near release or when E2E stabilization becomes its own stream.

## Why This Split

This repository has four real delivery streams with different rhythms:

1. the local-first product workflow
2. the import pipeline
3. the desktop shell and packaging layer
4. the marketing/auth/billing surface

Keeping each of these in its own worktree reduces collisions in:

- `apps/web/src/**`
- `apps/api/src/server.mjs`
- `packages/**`
- `tests/**`

## Workspace Ownership

### `mainline`

Use the primary checkout for:

- merging validated slices
- running full regression
- creating release candidates
- maintaining release docs and known issues

Do not use `mainline` for large feature work.

### `wt-core-workflow`

Owns the main app experience:

- `apps/web/src/components-*`
- `apps/web/src/prototype-*`
- `packages/domain/**`
- `packages/writing-engine/**`
- note, graph, and writing tests

Typical work:

- editor UX
- explorer behavior
- graph interactions
- writing project and scaffold flow
- note model refinements

Avoid:

- `apps/web/src/import-*`
- desktop build scripts
- marketing/auth/billing pages

### `wt-import-pipeline`

Owns import-specific behavior:

- `packages/connectors/**`
- `packages/markdown-engine/**`
- `apps/web/src/import-*`
- `tests/fixtures/imports/**`

Typical work:

- Markdown and Obsidian import
- external connector parsing
- preview, confirm, rollback
- import result clarity
- import history and recovery UX

Avoid:

- unrelated shell polish
- desktop runtime work
- writing/graph changes not directly tied to import handoff

### `wt-desktop-release`

Owns the desktop runtime and packaging path:

- `apps/desktop/**`
- `scripts/dev-desktop.mjs`
- `scripts/build-desktop.mjs`
- `scripts/desktop-*.mjs`
- `apps/web/src/desktop-*`
- `apps/web/src/path-picker-adapter.js`

Typical work:

- Tauri runtime
- choose-directory flows
- reveal/open-in-file-manager flows
- Windows path behavior
- NSIS and MSI packaging
- desktop-specific failure messaging

Avoid:

- import business logic
- generic shell redesign
- auth and billing unless the desktop shell explicitly depends on it

### `wt-growth-site`

Owns all public-facing conversion surfaces:

- `apps/web/src/marketing-*`
- auth and billing routes in `apps/api/src/server.mjs`
- pricing, login, register, billing docs/tests

Typical work:

- homepage
- product page
- pricing page
- login/register flows
- billing page
- Stripe checkout and portal

Avoid:

- core note workflow changes
- desktop packaging
- domain model refactors unrelated to auth/billing

### `wt-qa-hardening`

Open this only when QA becomes a real stream.

Owns:

- `tests/e2e/**`
- release smoke paths
- `docs/MVP_RUNTIME_CHECKLIST.md`
- known-issues and release-readiness docs

Typical work:

- browser E2E stabilization
- smoke checklist maintenance
- reproducible regression scripts
- release signoff evidence

Avoid:

- opportunistic product changes
- hidden business-logic changes mixed into test fixes

## When To Open A New Worktree

Open a new worktree only if at least one of these is true:

- the work will last more than two days
- it needs isolated ports or an isolated vault
- it is likely to conflict with another active stream
- it has a large fixture, test, or packaging footprint
- it may be abandoned and should be easy to delete wholesale

If none of these are true, prefer staying in the existing stream worktree.

## Branch Naming

Use one long-lived branch per long-lived worktree:

- `feat/core-workflow`
- `feat/import-pipeline`
- `feat/desktop-release`
- `feat/growth-site`
- `feat/qa-hardening`

For short-lived work inside a stream, branch from the stream branch only if the work is risky enough to isolate.

Recommended temporary branch pattern:

- `fix/core-editor-save-race`
- `spike/import-large-obsidian-vault`
- `docs/release-known-issues`

## Merge Policy

Merge in small slices.

A good merge unit:

- has one clear purpose
- passes the relevant local tests
- does not require explaining three unrelated behavior changes

Do not wait until a whole stream is "done" before merging. Large delayed merges are where most worktree benefits disappear.

Recommended merge order when multiple streams are active:

1. desktop runtime blockers
2. core workflow fixes needed by other streams
3. import pipeline changes
4. growth-site work
5. QA and checklist updates

## Collision Rules

Treat these areas as high-collision files:

- `apps/api/src/server.mjs`
- `apps/web/src/prototype-app.js`
- `apps/web/src/prototype-store.js`
- shared shell components under `apps/web/src/components-*`
- package exports under `packages/domain/src/index.mjs`

Rules:

1. If two streams need the same high-collision file, decide ownership first in `mainline`.
2. If a change is mostly cross-cutting contract work, do it in `mainline` first, then rebase the stream trees.
3. Do not let two worktrees independently redesign the same UI surface.

## Suggested Commands

The repository's default branch is currently `master`, and `scripts/worktree-create.ps1` defaults to `master` as well.

Create the default long-lived worktrees:

```powershell
npm run wt:create -- -Name core-workflow -Kind feat
npm run wt:create -- -Name import-pipeline -Kind feat
npm run wt:create -- -Name desktop-release -Kind feat
npm run wt:create -- -Name growth-site -Kind feat
```

Optional QA tree:

```powershell
npm run wt:create -- -Name qa-hardening -Kind feat
```

List active worktrees:

```powershell
npm run wt:list
```

Run services inside a worktree:

```powershell
npm run wt:run -- -Target all
npm run wt:run -- -Target api
npm run wt:run -- -Target web
```

## Daily Operating Rhythm

Recommended daily loop:

1. do feature work in the stream worktree
2. run only the tests relevant to that stream
3. merge a small validated slice into `mainline`
4. run minimum regression in `mainline`
5. rebase or merge `mainline` back into active stream trees when needed

Minimum regression after meaningful merges:

1. create directory
2. create note
3. edit and save note
4. insert `[[wikilink]]`
5. click `#tag`
6. import Markdown or Obsidian content
7. open graph
8. create writing project and scaffold

## Practical Limits

Do not keep more than these active at once unless there is a very strong reason:

- 4 long-lived development worktrees
- 1 temporary hotfix or spike worktree

Beyond that point, coordination overhead usually grows faster than delivery speed.

## Current Recommendation

For the next phase of this project, use:

1. `mainline`
2. `wt-core-workflow`
3. `wt-import-pipeline`
4. `wt-desktop-release`
5. `wt-growth-site`

Open `wt-qa-hardening` only when preparing a release candidate or when browser E2E stabilization becomes a top-level task.
