# Worktree Ownership Baseline

Date: 2026-05-10

This document records the post-cleanup worktree layout. The active feature branches have been closed or archived. The directories remain reusable workspaces for new threads.

Update 2026-05-10: a new desktop runtime slice is active at `E:\Projects\Thinking in Notes\yansilu-wt\feat-desktop-runtime` on branch `feat/desktop-runtime`.

Update 2026-05-18: `E:\Projects\Thinking in Notes\wt-public` is active on branch `wt-public` for the public website, demo showcase, marketing copy, and rich demo asset entry. Its detailed ownership note is `docs/WT_PUBLIC_OWNERSHIP_2026-05-18.md`.

## Current Rule

Use `E:\Projects\Thinking in Notes\yansilu` as the only integration surface.

Keep the other worktree directories as reusable desks. They should usually stay detached at `master` until a new thread begins real work. When starting work, create a fresh branch from the current `master` inside the matching directory.

```powershell
git switch master
git pull --ff-only
git -C "E:\Projects\Thinking in Notes\yansilu-wt\feat-core-workflow" switch --detach master
git -C "E:\Projects\Thinking in Notes\yansilu-wt\feat-core-workflow" switch -c feat/core-editor-floating-actions
```

## Reusable Directories

| Directory | Current Git Shape | Default Role | New Thread Mapping |
|---|---|---|---|
| `E:\Projects\Thinking in Notes\yansilu` | `master` | integration, merge, release readiness | one coordination thread only |
| `E:\Projects\Thinking in Notes\yansilu-wt\feat-core-workflow` | detached `master` | editor, explorer, graph, writing workflow | create a new core workflow thread |
| `E:\Projects\Thinking in Notes\yansilu-wt\feat-import-pipeline` | detached `master` | import preview, confirm, rollback, fixtures | create a new import thread |
| `E:\Projects\Thinking in Notes\yansilu-wt\feat-desktop-release` | detached `master` | Tauri shell, desktop packaging, updater, installer QA | create a new desktop release thread |
| `E:\Projects\Thinking in Notes\yansilu-wt\feat-desktop-runtime` | `feat/desktop-runtime` | final packaged-app walkthrough, worktree desktop preflight, desktop runtime fixes | active desktop runtime slice |
| `E:\Projects\Thinking in Notes\yansilu-wt\feat-growth-site` | detached `master` | marketing site, auth, billing, public copy | create a new growth/website thread |
| `E:\Projects\Thinking in Notes\wt-public` | `wt-public` | official site, demo showcase, marketing copy, rich demo asset entry | active public-facing product/demo thread |
| `E:\Projects\Thinking in Notes\yansilu-wt\feat-ai-agent-layer` | detached `master` | AI layer docs, model routing, future agent harness | create a new AI layer thread |

Closed threads do not make a directory unusable. A new thread can reuse the same directory as long as the directory is clean and starts from current `master`.

## Branch Policy

The long-lived `feat/*` branches from the May 9-10 cleanup are closed. Their final positions are preserved under `archive/closed-2026-05-10/*`.

Do not revive old feature branch names for new work. Prefer a short branch name that describes the next slice:

- `feat/core-floating-editor-actions`
- `feat/import-zotero-confirm-rollback`
- `feat/desktop-updater-feed`
- `feat/growth-download-release-copy`
- `docs/ai-agent-mvp-review`

Merge back to `master` from the main checkout after the slice is reviewed or locally validated.

## Ownership Boundaries

Core workflow owns:

- `apps/web/src/prototype-*`
- `apps/web/src/components-*`
- `packages/domain/**`
- `packages/writing-engine/**`
- note, graph, editor, and writing tests

Import pipeline owns:

- `packages/connectors/**`
- `packages/markdown-engine/**`
- `apps/web/src/import-*`
- `tests/fixtures/imports/**`
- import integration and unit tests

Desktop release owns:

- `apps/desktop/**`
- `scripts/dev-desktop.mjs`
- `scripts/build-desktop.mjs`
- `scripts/desktop-*.mjs`
- `scripts/release-*.mjs`
- desktop bridge files such as `apps/web/src/desktop-*` and `apps/web/src/path-picker-adapter.js`

The active `feat/desktop-runtime` branch currently owns the immediate RC1 packaged-app walkthrough and any small fixes needed to make desktop preflight, installer smoke, dialog/opener validation, and Windows path behavior reliable. Its generated `.env.worktree` uses `API_PORT=3100` and `WEB_PORT=5273` so it can run beside the main checkout's default `3000/5173` stack.

Growth site owns:

- `apps/web/src/marketing-*`
- public download/auth/billing surfaces
- growth docs under `docs/growth/**`

`wt-public` owns the current active public-facing website and demo pass:

- official website surfaces under `apps/web/src/marketing-*`
- `/demo`, `/demo/zettelkasten`, and `/demo/yijing` public entry pages
- marketing copy and public product positioning docs
- rich demo asset entry docs, fixtures, seed entry points, and focused demo tests

Coordinate `wt-public` changes with Growth site ownership if both worktrees are active. Prefer `wt-public` for the current website/demo/copy slice and keep `feat-growth-site` idle unless a separate auth, billing, or conversion task is opened.

AI agent layer owns:

- `docs/*AI*`
- `docs/*MODEL*`
- provider, routing, storage, privacy, and agent harness docs

## Runtime DB Policy

The example vault SQLite files are currently tracked seed/runtime files:

- `vault-example/yansilu-vault/.yansilu/catalog.db`
- `vault-example/yansilu-vault/.yansilu/graph-cache.db`
- `vault-example/yansilu-vault/.yansilu/vectors.db`

Normal app/API runs can rewrite them. Do not commit DB changes unless the task explicitly updates the example seed state.

For local worktrees that keep getting dirtied by these files, hide local runtime churn with:

```powershell
git update-index --skip-worktree vault-example/yansilu-vault/.yansilu/catalog.db vault-example/yansilu-vault/.yansilu/graph-cache.db vault-example/yansilu-vault/.yansilu/vectors.db
```

To intentionally edit or refresh the tracked seed DBs, first re-enable tracking:

```powershell
git update-index --no-skip-worktree vault-example/yansilu-vault/.yansilu/catalog.db vault-example/yansilu-vault/.yansilu/graph-cache.db vault-example/yansilu-vault/.yansilu/vectors.db
```

The `feat-growth-site` directory currently uses `skip-worktree` for these three DB files because background local runs were rewriting them during cleanup.

## Start Checklist

Before opening a new thread on a reusable directory:

1. Run `git status --porcelain`.
2. Run `git switch --detach master`.
3. Run `git pull --ff-only` in the main checkout if the remote is expected to be current.
4. Create a new branch only when code or docs will be changed.
5. Keep runtime DB and generated local files out of commits unless the task explicitly asks for them.
