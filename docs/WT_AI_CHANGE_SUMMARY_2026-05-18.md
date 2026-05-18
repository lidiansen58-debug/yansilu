# wt-ai Change Summary - 2026-05-18

This summary captures the current `wt-ai` workstream after the canonical-contract and frontend wiring slices.

## What Landed

### 1. Shared AI contract layer

Added repo-level canonical schemas for the main AI workstream objects:

- `schemas/ai_artifact.schema.json`
- `schemas/ai_inbox_item.schema.json`
- `schemas/ai_suggestion.schema.json`
- `schemas/ai_adoption_event.schema.json`
- `schemas/ai_scheduled_task.schema.json`

Related docs:

- `docs/WT_AI_HANDOFF_2026-05-18.md`
- `docs/AI_WORKSTREAM_BACKLOG_2026-05-18.md`
- `docs/AI_SHARED_MODELS_2026-05-18.md`

### 2. Runtime-to-canonical adapters

Added a thin one-way adapter layer in:

- `packages/ai-orchestrator/src/canonical-models.mjs`

Current exported adapters:

- `artifactToCanonical`
- `aiInboxItemToCanonical`
- `suggestionToCanonical`
- `scheduledTaskToCanonical`
- `artifactDecisionToCanonicalAdoptionEvent`
- `suggestionTransitionToCanonicalAdoptionEvent`

And exported them through:

- `packages/ai-orchestrator/src/index.mjs`

### 3. Canonical API support

Extended API routes so `?canonical=true` returns an additional canonical payload for:

- `AI inbox`
- `AI scheduled tasks`
- `AI suggestions`

Primary server changes:

- `apps/api/src/server.mjs`

### 4. Frontend canonical data path

The frontend no longer treats canonical responses as debug-only data.

Implemented canonical hydration for:

- `AI inbox` list and detail
- `scheduled tasks` list and edit/status flow
- `AI suggestions` frontend API surface

Key frontend files:

- `apps/web/src/prototype-api.js`
- `apps/web/src/prototype-app.js`
- `apps/web/src/ai-inbox-model.js`
- `apps/web/src/scheduled-tasks-model.js`
- `apps/web/src/ai-suggestions-model.js`

### 5. Minimal visible suggestion UI

Added a lightweight `AI suggestions` settings surface:

- filter by status / target type / target id / scope
- list view
- detail view
- status transitions for review flow

Key UI files:

- `apps/web/src/ai-suggestions-panel.js`
- `apps/web/src/prototype.html`

### 6. Debug visibility

Added a settings debug surface that shows recent runtime vs canonical payload snapshots for:

- inbox list
- inbox detail
- inbox decision
- scheduled tasks list
- scheduled task actions

Primary wiring:

- `apps/web/src/prototype-app.js`
- `apps/web/src/prototype.html`

## Verification

Validated across:

- shared schema contract tests
- canonical adapter unit tests
- API canonical integration tests
- web model and panel unit tests
- web prototype API unit tests
- `node --check apps/web/src/prototype-app.js`

Recent passing groups include:

- `tests/unit/ai-canonical-models.test.mjs`
- `tests/unit/ai-shared-schemas.test.mjs`
- `tests/integration/api-ai-canonical-response.test.mjs`
- `tests/integration/api-ai-suggestions-canonical.test.mjs`
- `tests/unit/web-ai-inbox-model.test.mjs`
- `tests/unit/web-scheduled-tasks-model.test.mjs`
- `tests/unit/web-ai-suggestions-model.test.mjs`
- `tests/unit/web-ai-suggestions-panel.test.mjs`
- `tests/unit/web-prototype-api.test.mjs`

## Current Shape

The workstream is now at a useful midpoint:

- canonical contracts exist
- runtime adapters exist
- API outputs are consistent
- frontend API consumers are consistent
- inbox, scheduled tasks, and suggestions all have at least one usable product-facing path

## Suggested Commit Split

### Commit 1: Contracts and docs

Scope:

- `docs/WT_AI_HANDOFF_2026-05-18.md`
- `docs/AI_WORKSTREAM_BACKLOG_2026-05-18.md`
- `docs/AI_SHARED_MODELS_2026-05-18.md`
- `schemas/ai_*.schema.json`
- `README.md`

Suggested message:

- `docs: define shared AI workstream contracts`

### Commit 2: Canonical runtime + API

Scope:

- `packages/ai-orchestrator/src/canonical-models.mjs`
- `packages/ai-orchestrator/src/index.mjs`
- `apps/api/src/server.mjs`
- `tests/unit/ai-canonical-models.test.mjs`
- `tests/unit/ai-shared-schemas.test.mjs`
- `tests/integration/api-ai-canonical-response.test.mjs`
- `tests/integration/api-ai-suggestions-canonical.test.mjs`

Suggested message:

- `feat(ai): add canonical adapters and API responses`

### Commit 3: Frontend canonical consumption + minimal suggestion UI

Scope:

- `apps/web/src/prototype-api.js`
- `apps/web/src/prototype-app.js`
- `apps/web/src/prototype.html`
- `apps/web/src/ai-inbox-model.js`
- `apps/web/src/scheduled-tasks-model.js`
- `apps/web/src/ai-suggestions-model.js`
- `apps/web/src/ai-suggestions-panel.js`
- `tests/unit/web-ai-inbox-model.test.mjs`
- `tests/unit/web-scheduled-tasks-model.test.mjs`
- `tests/unit/web-ai-suggestions-model.test.mjs`
- `tests/unit/web-ai-suggestions-panel.test.mjs`
- `tests/unit/web-prototype-api.test.mjs`

Suggested message:

- `feat(web): consume canonical AI payloads in settings surfaces`

## Recommended Next Step

The next practical step is not more breadth.

It is to either:

1. commit the work using the split above, or
2. do one focused polish pass on the new `AI suggestions` settings surface before committing.
