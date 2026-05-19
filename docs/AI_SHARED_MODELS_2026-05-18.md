# AI Shared Models - 2026-05-18

This document defines the first canonical shared models for the `wt-ai` workstream.

## Goal

The repo already has working runtime contracts inside `packages/ai-orchestrator/src/`.
What it lacked was a repo-level canonical schema layer that other modules can reference without depending on internal implementation details.

This slice establishes four shared objects:

1. `AIArtifact`
2. `AIInboxItem`
3. `AISuggestion`
4. `AIAdoptionEvent`
5. `AIScheduledTask`

## Canonical Schema Files

- `schemas/ai_artifact.schema.json`
- `schemas/ai_inbox_item.schema.json`
- `schemas/ai_suggestion.schema.json`
- `schemas/ai_adoption_event.schema.json`
- `schemas/ai_scheduled_task.schema.json`

## Runtime Mapping

### AIArtifact

Runtime source:
- `packages/ai-orchestrator/src/artifacts.mjs`
- `packages/ai-orchestrator/src/artifact-store.mjs`
- `packages/ai-orchestrator/src/sqlite-artifact-store.mjs`

Canonical intent:
- A durable AI-produced object waiting for review, already reviewed, or archived.
- Includes provenance, privacy, confidence, source references, and user decisions.

Important mapping:
- runtime `artifact.id` -> schema `id`
- runtime `artifact.agentRunId` -> schema `agent_run_id`
- runtime `artifact.contextPackId` -> schema `context_pack_id`
- runtime `artifact.sources.noteIds` -> schema `sources.note_ids`
- runtime `artifact.userDecisions` -> schema `user_decisions`
- runtime `artifact.payload.fieldSuggestionId` -> schema `field_suggestion_id` for inbox artifacts that mirror a field-level suggestion

Note:
- Runtime currently uses camelCase.
- Canonical JSON schema uses snake_case to match the repo's existing schema convention.

### AIInboxItem

Runtime source:
- `packages/ai-orchestrator/src/artifact-inbox.mjs`

Canonical intent:
- A review-oriented projection derived from an artifact.
- This is not the source-of-truth artifact itself.
- It exists so UI/API layers can depend on a stable review contract.

Important mapping:
- runtime `toAiInboxItem(artifact).artifactId` -> schema `artifact_id`
- runtime `primarySourceNoteId` -> schema `primary_source_note_id`
- runtime `latestDecision` -> schema `latest_decision`
- runtime `decisionCount` -> schema `decision_count`

### AISuggestion

Runtime source:
- `packages/ai-orchestrator/src/suggestions.mjs`
- `packages/ai-orchestrator/src/suggestion-store.mjs`
- `packages/ai-orchestrator/src/sqlite-suggestion-store.mjs`

Canonical intent:
- A targeted suggestion against a specific user object or object field.
- Suggestion state is narrower than artifact state and tracks adoption/edit/confirmation flow.

Important mapping:
- runtime `suggestion.target` -> schema `target`
- runtime `suggestion.sourceArtifactId` -> schema `source_artifact_id` when the suggestion is mirrored by an inbox artifact
- runtime `suggestion.provenance.humanConfirmed` -> schema `provenance.human_confirmed`
- runtime `suggestion.provenance.humanEdited` -> schema `provenance.human_edited`
- runtime `suggestion.history` -> schema `history`
- runtime field-targeted review semantics -> schema `content_source = "target_note_mirror"`

Content-source note:
- `AISuggestion.content` is not always an autonomous record-level draft.
- For non-field suggestions, `content_source` is `suggestion_record`.
- For field-targeted suggestions in `suggested` or `rejected`, the canonical payload still reflects the suggestion record itself, so `content_source` remains `suggestion_record`.
- For field-targeted suggestions in `adopted_as_draft`, `edited`, or `confirmed`, the review flow is note-backed and the target note field becomes the source of truth, so canonical payloads mark `content_source` as `target_note_mirror`.
- This makes the runtime rule explicit instead of leaving it implicit in server behavior.

Field-level mapping note:
- `AI Inbox` remains the review surface for persisted artifacts.
- `AI Suggestions` remains the field-level suggestion surface.
- When a field suggestion is mirrored into an inbox artifact, the canonical contract now exposes the stable mapping on both sides:
  - artifact `field_suggestion_id`
  - suggestion `source_artifact_id`

### AIAdoptionEvent

Runtime source today:
- artifact decisions in `artifact-store.mjs`
- suggestion transitions in `suggestions.mjs`

Canonical intent:
- A normalized event layer for "what the user did with AI output."
- This model intentionally spans both artifacts and suggestions.
- It allows downstream analytics, auditing, and product metrics to stop depending on two different history formats.

Current mapping guidance:
- artifact decision -> `subject_kind = "artifact"`
- suggestion transition -> `subject_kind = "suggestion"`
- artifact `decision` or suggestion `toStatus` -> `event_type`
- artifact `noteId` or suggestion target info -> `metadata.note_id` or `target`

### AIScheduledTask

Runtime source:
- `packages/ai-orchestrator/src/scheduled-agent-tasks.mjs`
- `packages/ai-orchestrator/src/sqlite-scheduled-agent-task-store.mjs`

Canonical intent:
- A durable recurring or deferred AI execution contract.
- It captures scheduling, scope, model policy, budget policy, privacy rules, output destination, and latest run state.

Important mapping:
- runtime `scheduledTaskId` -> schema `scheduled_task_id`
- runtime `taskType` -> schema `task_type`
- runtime `lastRunAt` -> schema `last_run_at`
- runtime `lastRunStatus` -> schema `last_run_status`
- runtime `lastRunReason` -> schema `last_run_reason`
- runtime `lastAgentRunId` -> schema `last_agent_run_id`
- runtime `nextRunAt` -> schema `next_run_at`

Important note:
- Current runtime also exposes templates such as `weekly_link_suggestions`.
- This schema is for persisted task instances, not for task templates.

## Design Choices

- Keep shared schemas descriptive, not overly smart.
- Prefer explicit review and adoption fields over implicit status-only interpretation.
- Treat `AIInboxItem` as a projection contract.
- Treat `AIAdoptionEvent` as the future cross-surface analytics contract, even though runtime storage is not unified yet.
- Keep the first adapter layer one-way: runtime camelCase objects can serialize into canonical snake_case payloads without forcing the whole runtime to change shape.

## Adapter Layer

Runtime serializers now live in:
- `packages/ai-orchestrator/src/canonical-models.mjs`

Current exports:
- `artifactToCanonical`
- `aiInboxItemToCanonical`
- `suggestionToCanonical`
- `scheduledTaskToCanonical`
- `artifactDecisionToCanonicalAdoptionEvent`
- `suggestionTransitionToCanonicalAdoptionEvent`

These are intentionally thin adapters around the current runtime contracts. They do not replace runtime normalizers or stores.

## What This Does Not Solve Yet

- No canonical scheduled-task template schema yet.
- No repo-wide camelCase <-> snake_case adapter layer yet.
- No consolidated analytics/event store yet.

## Recommended Next Slice

The next clean follow-up is a small adapter layer that can serialize runtime camelCase objects into canonical schema-shaped payloads, plus a template-level schema for scheduled task presets.
