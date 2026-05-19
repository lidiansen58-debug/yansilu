# wt-ai PR Summary - 2026-05-19

## Title

Establish canonical AI contracts and wire them through API and web settings surfaces

## Summary

This PR introduces a canonical contract layer for the AI workstream and carries it through three levels of the product:

1. shared schemas and docs
2. runtime adapters and API responses
3. frontend consumption in settings-facing AI surfaces

The main goal is to stop treating AI payloads as ad hoc internal shapes and instead establish one stable contract for:

- AI inbox artifacts
- AI inbox list items
- AI suggestions
- AI adoption events
- AI scheduled tasks

## Why

Before this change:

- AI objects existed mostly as runtime-only camelCase structures
- API responses were useful but not canonical
- frontend consumers were coupled to local response shapes
- canonical review/debug flows were harder to reason about across inbox, scheduled tasks, and suggestions

After this change:

- shared AI objects have repo-level schema definitions
- runtime adapters can serialize product state into canonical snake_case payloads
- API routes can expose canonical responses with `?canonical=true`
- web settings surfaces can consume canonical payloads while still rendering existing runtime-oriented UI shapes

## Commit Structure

### 1. `2e7c635`

`docs: define shared AI workstream contracts`

Introduces:

- AI workstream handoff doc
- AI backlog doc
- shared AI model doc
- change summary doc
- canonical JSON schemas for artifact, inbox item, suggestion, adoption event, and scheduled task
- README links to the new docs

### 2. `a824fea`

`feat(ai): add canonical adapters and API responses`

Introduces:

- one-way runtime-to-canonical adapter layer in `packages/ai-orchestrator/src/canonical-models.mjs`
- exports for canonical adapters
- `?canonical=true` API support for:
  - AI inbox
  - AI scheduled tasks
  - AI suggestions
- unit and integration coverage for canonical adapters and API responses

### 3. `5522bd3`

`feat(web): consume canonical AI payloads in settings surfaces`

Introduces:

- frontend canonical hydration for inbox list/detail
- frontend canonical hydration for scheduled tasks
- frontend canonical hydration for AI suggestions
- settings debug surface for runtime vs canonical payload snapshots
- minimal settings UI for AI suggestions review flow
- web unit coverage for model hydration, API behavior, and panel rendering

## Key Files

### Contracts and docs

- `docs/WT_AI_HANDOFF_2026-05-18.md`
- `docs/AI_WORKSTREAM_BACKLOG_2026-05-18.md`
- `docs/AI_SHARED_MODELS_2026-05-18.md`
- `docs/WT_AI_CHANGE_SUMMARY_2026-05-18.md`
- `schemas/ai_artifact.schema.json`
- `schemas/ai_inbox_item.schema.json`
- `schemas/ai_suggestion.schema.json`
- `schemas/ai_adoption_event.schema.json`
- `schemas/ai_scheduled_task.schema.json`

### Runtime and API

- `packages/ai-orchestrator/src/canonical-models.mjs`
- `packages/ai-orchestrator/src/index.mjs`
- `apps/api/src/server.mjs`

### Web

- `apps/web/src/prototype-api.js`
- `apps/web/src/prototype-app.js`
- `apps/web/src/prototype.html`
- `apps/web/src/ai-inbox-model.js`
- `apps/web/src/scheduled-tasks-model.js`
- `apps/web/src/ai-suggestions-model.js`
- `apps/web/src/ai-suggestions-panel.js`

## Product Impact

### AI inbox

- supports canonical API payloads
- frontend list and detail can hydrate from canonical responses
- review actions preserve canonical debug visibility

### Scheduled tasks

- supports canonical API payloads
- frontend list and edit/status paths hydrate from canonical responses

### AI suggestions

- supports canonical API payloads
- frontend API layer now hydrates canonical responses into runtime suggestion objects
- settings now has a minimal review surface for suggestions

## Verification

Covered by:

- `tests/unit/ai-canonical-models.test.mjs`
- `tests/unit/ai-shared-schemas.test.mjs`
- `tests/integration/api-ai-canonical-response.test.mjs`
- `tests/integration/api-ai-suggestions-canonical.test.mjs`
- `tests/unit/web-ai-inbox-model.test.mjs`
- `tests/unit/web-scheduled-tasks-model.test.mjs`
- `tests/unit/web-ai-suggestions-model.test.mjs`
- `tests/unit/web-ai-suggestions-panel.test.mjs`
- `tests/unit/web-prototype-api.test.mjs`

Also checked:

- `node --check apps/web/src/prototype-app.js`

## Review Guidance

Recommended review order:

1. schemas and docs
2. runtime adapter layer
3. API response shaping
4. frontend canonical hydration
5. settings-facing AI suggestions UI

Highest-signal questions for review:

- Do the canonical schemas reflect the product objects we want to stabilize long-term?
- Is `?canonical=true` the right compatibility boundary for the current API phase?
- Are the frontend canonical hydration helpers narrow enough to avoid hidden coupling?
- Is the minimal suggestions UI the right size for now, or should it stay debug-only?

## Risks

- The web settings surface now does more AI review work; if that surface changes heavily later, some wiring may move.
- Canonical adapters are currently one-way serializers plus frontend hydration helpers, not a full bidirectional contract system.
- API compatibility is preserved by keeping canonical responses opt-in; consumers must still explicitly request them.

## Follow-ups

- Decide whether canonical responses should become default for some internal surfaces later.
- Consider extracting shared frontend AI hydration helpers beyond settings.
- Consider promoting the suggestions surface out of settings once the review workflow matures.
