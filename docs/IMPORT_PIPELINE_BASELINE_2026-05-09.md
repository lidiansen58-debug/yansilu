# Import Pipeline Baseline 2026-05-09

## Goal

Define the smallest coherent baseline for the `wt-import-pipeline` worktree so it can be recreated from a committed branch instead of the current dirty checkout.

This baseline is not the whole repository state. It is the subset needed to keep the import pipeline runnable and testable:

- import preview
- import candidate preview UI
- selective confirm
- import history
- rollback
- import-to-writing handoff

## Include In Baseline

### Import pipeline backend

- `packages/connectors/src/external-candidates.mjs`
- `packages/connectors/src/import-record-store.mjs`
- `packages/markdown-engine/**`
- `apps/api/src/server.mjs`
- `tests/integration/api-import-confirm.test.mjs`
- `tests/integration/api-export-and-connectors.test.mjs`
- `tests/unit/connectors-external-candidates.test.mjs`
- `tests/unit/connectors-import-record-store.test.mjs`
- `tests/unit/markdown-engine-import-candidates.test.mjs`
- `tests/fixtures/imports/**`

### Domain support required by current import and follow-up flows

- `packages/domain/src/catalog-store.mjs`
- `packages/domain/src/note-catalog-store.mjs`
- `packages/domain/src/index.mjs`
- `packages/domain/src/index-card-store.mjs`
- `packages/domain/src/markdown-asset-links.mjs`
- `packages/domain/src/note-file-rewrite.mjs`
- `packages/domain/src/sqlite-migrations.mjs`
- `packages/domain/src/sqlite/001_catalog_v1_2.sql`
- `packages/domain/src/sqlite/005_catalog_v1_6.sql`
- `packages/domain/src/sqlite/006_catalog_v1_7.sql`
- `tests/unit/sqlite-migrations.test.mjs`
- `tests/integration/api-directories.test.mjs`
- `tests/integration/api-notes.test.mjs`

### Import pipeline frontend

- `apps/web/src/import-candidate-preview-model.js`
- `apps/web/src/import-candidate-preview-panel.js`
- `apps/web/src/import-history-controls.js`
- `apps/web/src/import-history-model.js`
- `apps/web/src/import-history-mount.js`
- `apps/web/src/import-history-panel.js`
- `apps/web/src/import-history-summary.js`
- `apps/web/src/import-page-mount.js`
- `apps/web/src/import-result-model.js`
- `apps/web/src/import-result-mount.js`
- `apps/web/src/import-result-panel.js`
- `apps/web/src/import-toolbar-actions.js`
- `apps/web/src/import-toolbar-model.js`
- `apps/web/src/import-toolbar-mount.js`
- `apps/web/src/import-toolbar-panel.js`
- `tests/unit/web-import-candidate-preview-model.test.mjs`
- `tests/unit/web-import-candidate-preview-panel.test.mjs`
- `tests/unit/web-import-history-controls.test.mjs`
- `tests/unit/web-import-history-model.test.mjs`
- `tests/unit/web-import-history-mount.test.mjs`
- `tests/unit/web-import-history-panel.test.mjs`
- `tests/unit/web-import-history-summary.test.mjs`
- `tests/unit/web-import-page-mount.test.mjs`
- `tests/unit/web-import-result-model.test.mjs`
- `tests/unit/web-import-result-mount.test.mjs`
- `tests/unit/web-import-result-panel.test.mjs`
- `tests/unit/web-import-toolbar-actions.test.mjs`
- `tests/unit/web-import-toolbar-model.test.mjs`
- `tests/unit/web-import-toolbar-panel.test.mjs`

### Follow-up writing handoff coverage

- `packages/writing-engine/src/writing-engine.mjs`
- `tests/integration/api-writing.test.mjs`
- `tests/e2e/prototype-browser.test.mjs`

## Keep Out Of This Baseline

These tracks are real work, but they should not be required to bootstrap `wt-import-pipeline`:

### Marketing, auth, and billing

- `apps/web/src/marketing-*`
- auth and billing routes in `apps/api/src/server.mjs`
- Stripe configuration and docs
- marketing-only docs

### Paper workspace / NotebookLM workflow

- `packages/paper-workspace/**`
- paper workspace routes in `apps/api/src/server.mjs`
- `tests/integration/api-paper-workspace.test.mjs`
- `tests/unit/paper-workspace-*.test.mjs`
- `tests/unit/web-paper-workspace-*.test.mjs`
- paper-workspace docs

### Broader desktop and release work

- `apps/desktop/**`
- desktop bundle scripts
- marketing download manifest flow
- release-only docs and generated artifacts

## Current Baseline Blockers

### 1. `apps/api/src/server.mjs` is mixed

The import pipeline changes share the same file with:

- auth session routes
- billing and Stripe routes
- paper workspace routes

That means the import baseline cannot be staged cleanly without either:

1. committing a broader WIP branch, or
2. splitting those route groups into separate modules first

### 2. `apps/web/src/dev-server.mjs` is mixed

The dev server now serves:

- prototype editor/import pages
- marketing pages
- download manifest and bundle files
- paper workspace page

This is another file where the import workstream and other workstreams are coupled.

### 3. The current worktree was created from committed `master`, not the dirty checkout

Because the main checkout contains uncommitted files like `packages/domain/src/index-card-store.mjs`, a fresh worktree from `master` is missing files that the current API expects.

## Practical Recommendation

For the next baseline step, prefer one of these approaches:

1. Fastest path:
   commit one broader "workspace baseline" branch that includes import, required domain changes, and any currently coupled entrypoint files

2. Cleaner long-term path:
   first split `apps/api/src/server.mjs` and `apps/web/src/dev-server.mjs` so import routes/pages can be committed independently from marketing/auth/billing/paper workspace

If the immediate goal is to get `wt-import-pipeline` running quickly, option 1 is lower risk.
If the immediate goal is to keep worktrees sharply scoped, option 2 is the better investment.
