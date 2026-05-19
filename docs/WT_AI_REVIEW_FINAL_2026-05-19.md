# wt-ai Final Review Note - 2026-05-19

## Review Scope

This thread establishes and wires a canonical AI contract through docs, runtime, API, and web settings surfaces.

The main object families covered are:

- AI inbox artifacts
- AI inbox list items
- AI suggestions
- AI adoption events
- AI scheduled tasks

## Current Commit Sequence

Review the branch in this order:

1. `2e7c635` `docs: define shared AI workstream contracts`
2. `a824fea` `feat(ai): add canonical adapters and API responses`
3. `5522bd3` `feat(web): consume canonical AI payloads in settings surfaces`
4. `18ff789` `docs: add wt-ai PR summary and short description`
5. `78816a4` `fix(web): align suggestion review flow with edited state`
6. `3beb4f3` `fix(ai): clarify suggestion content source and schema validation`

## What Changed

### 1. Shared contract layer

Added repo-level schemas and docs for the canonical AI model set:

- `schemas/ai_artifact.schema.json`
- `schemas/ai_inbox_item.schema.json`
- `schemas/ai_suggestion.schema.json`
- `schemas/ai_adoption_event.schema.json`
- `schemas/ai_scheduled_task.schema.json`

Supporting docs:

- `docs/WT_AI_HANDOFF_2026-05-18.md`
- `docs/AI_WORKSTREAM_BACKLOG_2026-05-18.md`
- `docs/AI_SHARED_MODELS_2026-05-18.md`
- `docs/WT_AI_CHANGE_SUMMARY_2026-05-18.md`
- `docs/WT_AI_PR_SUMMARY_2026-05-19.md`
- `docs/WT_AI_PR_DESCRIPTION_SHORT_2026-05-19.md`

### 2. Runtime and API canonicalization

Added a one-way adapter layer:

- `packages/ai-orchestrator/src/canonical-models.mjs`

And exposed canonical API payloads with `?canonical=true` for:

- AI inbox
- AI scheduled tasks
- AI suggestions

Primary files:

- `packages/ai-orchestrator/src/index.mjs`
- `apps/api/src/server.mjs`

### 3. Frontend canonical consumption

The web layer now consumes canonical payloads instead of treating them as debug-only side data.

Current web coverage:

- AI inbox list and detail hydrate from canonical payloads
- scheduled tasks hydrate from canonical payloads
- AI suggestions hydrate from canonical payloads
- settings includes runtime vs canonical debug snapshots
- settings includes a minimal AI suggestions review surface

Primary files:

- `apps/web/src/prototype-api.js`
- `apps/web/src/prototype-app.js`
- `apps/web/src/prototype.html`
- `apps/web/src/ai-inbox-model.js`
- `apps/web/src/scheduled-tasks-model.js`
- `apps/web/src/ai-suggestions-model.js`
- `apps/web/src/ai-suggestions-panel.js`

### 4. Post-review blocking fix

The latest fix commit aligns the suggestion review UI with the existing runtime lifecycle:

- keep `suggested -> adopted_as_draft -> edited -> confirmed`
- remove UI ambiguity about where editing should happen
- add regression coverage for adopted-as-draft canonical artifact handling

Primary files:

- `apps/web/src/ai-suggestions-panel.js`
- `tests/unit/web-ai-suggestions-panel.test.mjs`
- `tests/unit/ai-canonical-models.test.mjs`

### 5. Post-review contract and validation follow-up

The latest follow-up commit closes three review concerns:

- makes `AISuggestion.content` semantics explicit with `content_source`
- makes field-targeted `edited/confirmed` transitions read from the target note as the source of truth
- upgrades integration coverage so real canonical API responses are validated through schema helpers

Primary files:

- `schemas/ai_suggestion.schema.json`
- `docs/AI_SHARED_MODELS_2026-05-18.md`
- `packages/ai-orchestrator/src/canonical-models.mjs`
- `apps/api/src/server.mjs`
- `apps/web/src/ai-inbox-model.js`
- `apps/web/src/ai-suggestions-model.js`
- `apps/web/src/ai-suggestions-panel.js`
- `apps/web/src/prototype-app.js`
- `tests/helpers/schema-validation.mjs`
- `tests/integration/api-ai-canonical-response.test.mjs`
- `tests/integration/api-ai-suggestions-canonical.test.mjs`

## Why This Matters

Before this branch:

- AI data structures were mostly runtime-local shapes
- API consumers depended on ad hoc response forms
- frontend review surfaces were not aligned around one stable contract

After this branch:

- canonical AI objects exist as shared schema contracts
- runtime can serialize into those contracts
- APIs can expose canonical payloads without breaking compatibility
- frontend settings surfaces can consume canonical responses directly

## Suggested Review Order

1. Shared schemas and docs
2. Runtime canonical adapters
3. API `?canonical=true` response shaping
4. Frontend canonical hydration
5. AI suggestions settings surface
6. Final `edited`-flow alignment fix
7. Suggestion content-source and schema-validation follow-up

## Key Questions For Review

- Are the canonical schemas the right long-term boundary for these AI objects?
- Is `?canonical=true` the right compatibility mechanism for this phase?
- Are the runtime adapters sufficiently thin and non-invasive?
- Is the frontend hydration approach narrow enough to avoid hidden coupling?
- Is the minimal AI suggestions review surface the right size for now?
- Does the retained `edited` step make the review flow clearer rather than noisier?
- Is `content_source` explicit enough to make field-targeted suggestion semantics understandable from the canonical contract itself?
- Do the updated integration tests go far enough toward treating real canonical API responses as contract-checked outputs instead of example payloads?

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
- `tests/helpers/schema-validation.mjs`

Also checked:

- `node --check apps/web/src/prototype-app.js`

## Current State

The `wt-ai` worktree is clean and ready for push / review.
