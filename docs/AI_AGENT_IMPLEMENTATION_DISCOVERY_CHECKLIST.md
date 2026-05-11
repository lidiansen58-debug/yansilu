# AI Agent Implementation Discovery Checklist

> Status: pre-implementation checklist
> Date: 2026-05-10
> Workstream: `feat/ai-agent-layer`
> Related: `AI_AGENT_LAYER_MVP_IMPLEMENTATION_PLAN.md`, `CORE_NOTE_APP_INTEGRATION_CONTRACT_V1.md`

## 1. Purpose

This checklist defines what to inspect before writing the first AI / Agent implementation.

The goal is to keep the AI layer aligned with the existing codebase and avoid inventing abstractions that duplicate or fight the core note app.

## 2. Repository Discovery

Before implementation, identify:

- Current app entry points.
- Existing package structure.
- Existing domain/store package.
- Current note model and source model.
- Current search/index implementation.
- Current import/source document pipeline.
- Existing database migration pattern.
- Existing worker/background job pattern.
- Existing auth/billing configuration if any.
- Existing UI extension points for sidebars, inboxes, or panels.

## 3. Core API Discovery

Confirm whether these exist:

- Stable note id.
- Stable source doc id.
- Block id or selection model.
- `readNote` equivalent.
- `searchNotes` equivalent.
- Source document chunk read.
- Project/topic metadata.
- Graph/link read/write.
- Note update events.
- User settings store.
- Secure secret storage.

## 4. Storage Discovery

Inspect:

- Database type.
- Migration files.
- Table naming conventions.
- JSON column support.
- Timestamp convention.
- Id generation convention.
- Local/cloud sync assumptions.
- Delete behavior.
- Test fixtures.

Decision needed:

- Should AI tables live in the existing database migration path?
- Should AI artifacts share note storage or remain strictly separate tables?
- Should run logs sync across devices?

## 5. Runtime Discovery

Inspect:

- Existing worker app or background process.
- Scheduler support.
- Desktop versus web process boundaries.
- API server availability.
- Environment variable loading.
- Logging and telemetry conventions.
- Error handling conventions.

Decision needed:

- Where does Agent Harness run first: desktop, worker, API, or shared package?

## 6. Provider and Secret Discovery

Inspect:

- Existing OpenAI usage, if any.
- Environment variable patterns.
- Desktop secret storage.
- Server-side secret storage.
- User settings persistence.
- Billing or subscription state.

Decision needed:

- Does MVP use platform-managed AI first, BYOK first, or both?
- Where are provider keys stored for desktop users?
- How are keys withheld from Run Logs?

## 7. UI Discovery

Inspect:

- Existing editor sidecar or right panel.
- Existing inbox or notification surface.
- Existing settings UI.
- Existing import/research workspace UI.
- Existing toasts/alerts.
- Existing command palette or actions.

Decision needed:

- Where do AI artifacts appear first?
- Where does `Auto / Economy / Deep Thinking` mode live?
- Where can users pause background AI?

## 8. Test Discovery

Inspect:

- Unit test runner.
- Integration test pattern.
- E2E or Playwright setup.
- Fixture locations.
- Snapshot conventions.
- CI constraints.

Decision needed:

- Where should eval fixtures live?
- What is the minimum automated test for first harness skeleton?

## 9. First Implementation Slice

The safest first code slice should be:

```text
AI package skeleton
  -> in-memory/mock provider adapter
  -> in-memory run log
  -> artifact schema validation
  -> fake current-note Context Pack
  -> no real model call
```

This validates boundaries before adding network providers.

## 10. Exit Criteria For Discovery

Discovery is complete when we know:

- Where AI package code should live.
- Where migrations should live.
- Which note APIs are stable enough.
- Which first UI surface can show AI artifacts.
- Which runtime can execute foreground agent tasks.
- Which secret strategy is safe enough for MVP.
- Which tests can protect the first implementation slice.

