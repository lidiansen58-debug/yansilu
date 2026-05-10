# AI Agent Implementation Discovery Report

> Status: discovery report
> Date: 2026-05-10
> Workstream: `feat/ai-agent-layer`
> Related: `AI_AGENT_IMPLEMENTATION_DISCOVERY_CHECKLIST.md`, `AI_AGENT_LAYER_MVP_IMPLEMENTATION_PLAN.md`

## 1. Summary

The current codebase is ready for an AI / Agent layer to begin as an isolated package and mock runtime, but it is not yet ready for broad real-model automation or background AI.

Recommended first implementation slice:

```text
packages/ai-orchestrator
  -> mock provider adapter
  -> in-memory run log
  -> artifact schema validation
  -> fake/current-note Context Pack builder
  -> no real OpenAI call yet
  -> no note mutation
```

This keeps the AI workstream independent from core note development and validates boundaries before provider, scheduler, UI, or storage integration.

## 2. Repository Shape

The repo is a Node/ESM monorepo.

Observed structure:

- `apps/api`: local HTTP API server.
- `apps/web`: web prototype UI.
- `apps/worker`: background worker scaffold.
- `packages/domain`: vault, catalog, note, graph, tags, SQLite migrations.
- `packages/originality-guard`: existing originality policy logic.
- `packages/connectors`: import records and external candidates.
- `packages/paper-workspace`: paper workflow.
- `packages/writing-engine`: writing project/scaffold workflow.
- `tests/unit`, `tests/integration`, `tests/e2e`: Node test structure.

Implication:

- AI layer should start in the existing `packages/ai-orchestrator` placeholder package.
- API/UI integration can come after package-level tests pass.

## 3. Existing Core Note Capabilities

Available now:

- Stable note ids in `notes.id`.
- Note metadata in SQLite catalog.
- Directory membership.
- Tags and tag-to-note lookup.
- Links and relation lookup.
- Graph path/conflict helpers.
- Read note by id.
- Update note content.
- Create note in directory.
- Markdown-backed note body.
- Permanent-note originality guard behavior.

Important existing APIs/functions:

- `getNoteById(vaultPath, noteId)`
- `listNotesInDirectory(vaultPath, directoryId)`
- `listNoteRelations(vaultPath, noteId)`
- `listTags(vaultPath, options)`
- `listNotesByTag(vaultPath, tagName, options)`
- `detectGraphConflicts(vaultPath, input)`
- `createNoteInDirectory(vaultPath, input)`
- `updateNoteContent(vaultPath, noteId, input)`

Implication:

- P0 Context Pack can use current note, selected notes, directory notes, relations, and tags.
- Generic text/semantic search can wait.

## 4. Missing or Partial Core Capabilities

Missing or not obvious yet:

- Block ids for paragraph/span-level context.
- General note search API.
- Semantic retrieval API.
- Explicit privacy metadata on notes/projects/sources.
- AI artifact store.
- Agent run log store.
- Scheduled task store.
- Provider secret storage.
- AI Inbox UI.
- User decision/promotion workflow.

Implication:

- First AI implementation should not depend on block-level provenance, semantic search, privacy metadata, or AI Inbox UI.
- First slice can use in-memory fixtures and current-note context.

## 5. Storage Discovery

Current storage:

- SQLite catalog DB: `.yansilu/catalog.db`.
- Graph cache DB: `.yansilu/graph-cache.db`.
- Vector DB: `.yansilu/vectors.db`.
- Migration plan is centralized in `packages/domain/src/sqlite-migrations.mjs`.
- Catalog migrations live under `packages/domain/src/sqlite/*.sql`.

Existing migration pattern:

- SQL file per migration.
- Migration id and checksum stored in `schema_migrations`.
- Uses Node `node:sqlite` and `DatabaseSync`.

Recommendation:

- Do not add AI storage migrations in the first mock slice.
- When persistence begins, prefer a separate AI DB file such as `.yansilu/ai-agent.db` or a clearly separated AI migration group.
- Keep AI tables out of core `notes` mutation paths.

## 6. Worker Discovery

`apps/worker/src/worker.mjs` is currently a heartbeat scaffold.

Implication:

- Scheduled Agent Tasks have a natural future home in `apps/worker`.
- Do not start scheduled tasks until run log, artifact store, privacy gate, and budget gate exist.

## 7. API Discovery

`apps/api/src/server.mjs` is a local HTTP server with manually handled routes.

Available route families include:

- Vault.
- Directories.
- Notes.
- Relations.
- Graph.
- Tags.
- Import.
- Paper workspace.
- Writing workflow.
- Auth/billing.

Implication:

- AI API routes can eventually be added under `/api/v1/ai/*`.
- First implementation should stay package-level before adding API routes to avoid bloating the server file too early.

## 8. Originality Guard Discovery

There is already a standalone `packages/originality-guard` package with unit tests.

It supports:

- Similarity scoring.
- Originality plan normalization.
- Warning/block thresholds.
- Citation locator checks.

Implication:

- AI `Originality Guard Agent` can reuse or wrap this package.
- The current guard is rule-based and local, which is good for privacy and deterministic behavior.

## 9. Recommended First Package Shape

Create:

```text
packages/ai-orchestrator/src/index.mjs
packages/ai-orchestrator/src/harness.mjs
packages/ai-orchestrator/src/agent-registry.mjs
packages/ai-orchestrator/src/provider-adapter.mjs
packages/ai-orchestrator/src/mock-provider-adapter.mjs
packages/ai-orchestrator/src/run-log.mjs
packages/ai-orchestrator/src/artifacts.mjs
packages/ai-orchestrator/src/context-pack.mjs
```

Unit tests:

```text
tests/unit/ai-orchestrator-harness.test.mjs
tests/unit/ai-orchestrator-provider-adapter.test.mjs
tests/unit/ai-orchestrator-artifacts.test.mjs
tests/unit/ai-orchestrator-context-pack.test.mjs
```

## 10. First Slice Behavior

Build a fake foreground run:

```text
create task envelope
  -> build fake/current-note Context Pack
  -> route to mock Reflection Agent
  -> call mock provider adapter
  -> create ReflectionPrompt artifact
  -> write in-memory Run Log
  -> assert no note mutation
```

This validates:

- Harness flow.
- Model-neutral provider adapter.
- Artifact schema.
- Run log event capture.
- Context Pack shape.
- Originality boundary.

## 11. Suggested Acceptance For First Slice

Tests should prove:

- A run creates one artifact.
- A run logs task, agent, model tier, provider, context id, usage, and artifact id.
- Mock provider output is schema-validated.
- Invalid artifact output fails safely.
- `local_only` context rejects cloud provider route.
- No tool exposes `write_human_note`.

## 12. Decisions Before Real Provider Integration

Before adding OpenAI or any real provider:

- Decide first secret strategy.
- Decide whether real provider code lives in same package or separate adapter package.
- Decide exact model config source.
- Decide whether full prompt/output is stored during dev.
- Decide whether to add AI DB migrations before or after real provider calls.

## 13. Key Risks

- `apps/api/src/server.mjs` is already large; avoid adding AI complexity there too early.
- Current notes do not expose block ids; avoid block-level provenance assumptions.
- No explicit privacy metadata exists yet; first implementation needs conservative defaults.
- No generic search API exists yet; Context Builder must start simple.
- External sync/worktree automation may detach or archive feature branches; check branch state before each commit.

## 14. Next Implementation Recommendation

Next concrete step:

```text
Implement packages/ai-orchestrator skeleton with mock provider and in-memory run log.
```

Do not yet:

- Call real OpenAI APIs.
- Add scheduled tasks.
- Add UI.
- Add note mutation.
- Add provider key storage.
- Add AI DB migrations.
