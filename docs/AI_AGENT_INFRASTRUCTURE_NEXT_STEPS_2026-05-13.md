# AI Agent Infrastructure Next Steps

> Date: 2026-05-13
> Workstream: `feat/ai-agent-layer`
> Context: Yansilu is a note-recording, note-linking, insight-making, and writing-assistance product. The AI layer should become a "Codex for thinking in notes", not a generic chat panel.

## 1. Product Thesis

The AI layer should help users move through this chain:

```text
captured notes
  -> visible relationships
  -> reviewable insights
  -> stronger judgment
  -> source-grounded writing
```

The system should not optimize for raw generation volume. It should optimize for:

- Better note relationships.
- Better questions.
- Better synthesis.
- Better writing structure.
- Clearer provenance and user ownership.

## 2. Current Infrastructure Baseline

Already present in this workstream:

- Agent Harness, Agent Registry, Context Pack, Run Log, Artifact Store.
- Model routing, provider config, provider health, fallback, and budget gates.
- Core note tools such as `search_notes`, `read_note`, and relation metadata reads.
- `reflection_agent` and `connection_agent` definitions.
- Scheduled task records, SQLite store, templates, runner, and HTTP API.
- Manual due-task execution through SQLite AI stores and core note tools.

This is enough to run bounded agent tasks. It is not yet enough to make AI outputs naturally enter the user's note, relation, and writing workflows.

## 3. Missing Infrastructure By Product Outcome

### 3.1 Reviewable AI Inbox

Needed because agent outputs must become user-reviewed product objects.

Build:

- List pending, accepted, ignored, revised, archived, and promoted artifacts.
- Add artifact decision API.
- Add feedback fields: useful, noisy, wrong, already_known, privacy_concern.
- Track what the user did next: accepted relation, created note, created scaffold, dismissed.
- Show provenance: source notes, context pack, run id, model route, privacy mode.

First useful actions:

- Accept a `LinkSuggestion`.
- Archive a `ReflectionPrompt`.
- Promote a `QuestionCard` into a note/index-card draft.
- Mark an artifact as noisy.

### 3.2 Graph-Aware Connection Agent

Needed because the product's core value is note relationships, not isolated summaries.

Build:

- Context builder support for backlinks, outgoing links, tags, directory scope, and graph paths.
- Tool contract for relation candidates and graph neighborhoods.
- Connection agent output that distinguishes:
  - missing link
  - bridge note needed
  - conflict/tension
  - duplicate idea
  - source gap
- Acceptance path that writes a real note relation only after user confirmation.

First useful scheduled task:

- Weekly link suggestions for selected directories/tags, with strict scope and budget caps.

### 3.3 Insight Artifact Types

Needed because "insight" should be typed and reviewable, not an unstructured paragraph.

Add or formalize:

- `InsightCard`: a concise possible new judgment.
- `BridgeCard`: a concept that connects two notes or clusters.
- `TensionCard`: a contradiction, unresolved assumption, or productive conflict.
- `SourceGap`: a missing citation/evidence/source requirement.
- `WritingMove`: a claim, counterpoint, transition, or section move useful for writing.

Each should include:

- source note ids
- confidence reason
- why it matters
- suggested user action
- promotion target

### 3.4 Writing Bridge Agent

Needed because writing support should grow from notes rather than from blank prompts.

Build:

- Tool/context support for selected note baskets and writing projects.
- Agent output as `OutlineDraft`, `WritingMove`, or scaffold artifact.
- Source-grounded draft scaffold generation.
- Gap detection: "this section lacks supporting notes."
- Counterpoint detection: "this claim has a nearby opposing note."

Avoid:

- One-click full essay generation as an MVP default.
- Silent insertion into human-authored drafts.

### 3.5 Local Worker Scheduler

Needed because scheduled agent tasks currently have API/manual execution but no autonomous local loop.

Build:

- Worker uses SQLite AI stores and core note tools.
- Periodically runs due scheduled tasks.
- Adds a simple lock to avoid overlapping runs.
- Logs skipped/no-op cycles without spamming.
- Stops after repeated failures or marks task health plainly.

First worker behavior:

```text
every N seconds:
  init vault
  open AI stores
  run due scheduled tasks
  summarize total/succeeded/skipped/failed
  close stores
```

### 3.6 Feedback And Evaluation Loop

Needed because "good insight" is user-dependent and cannot be validated only by model tests.

Build:

- Artifact usefulness feedback.
- Acceptance rate by agent, task type, model tier, and scope.
- False-positive/noisy suggestion tracking.
- Regression samples for Chinese notes, English papers, mixed-language synthesis, and graph-link quality.
- Small dashboards or debug summaries for provider failures, budget skips, and noisy agents.

## 4. Recommended Sequence

1. Wire the local worker to due scheduled tasks.
2. Add AI Inbox artifact listing and decision API.
3. Add accept/ignore/archive flow for `LinkSuggestion` and `ReflectionPrompt`.
4. Add graph-aware context inputs for the Connection Agent.
5. Add `InsightCard`, `BridgeCard`, `TensionCard`, `SourceGap`, and `WritingMove` schemas.
6. Add Writing Bridge Agent for note-basket to draft-scaffold flow.
7. Add feedback and evaluation summaries.

## 5. Near-Term Implementation Slices

### Slice A: Worker Due-Task Loop

Status:

- First implementation slice completed in `apps/worker/src/worker.mjs`.
- Focused coverage added in `tests/unit/worker-scheduled-agent-tasks.test.mjs`.

Files likely touched:

- `apps/worker/src/worker.mjs`
- `tests/unit` or a focused worker script test

Acceptance:

- Worker can run due scheduled tasks from a test vault.
- Worker does not double-run overlapping cycles.
- Worker logs clean summaries.

### Slice B: AI Inbox API

Status:

- First implementation slice completed in `apps/api/src/server.mjs`.
- `GET /api/v1/ai/inbox`, `GET /api/v1/ai/inbox/:artifactId`, and `POST /api/v1/ai/inbox/:artifactId/decision` are wired to the SQLite artifact store.
- Decision events persist normalized feedback flags: `useful`, `noisy`, `wrong`, `alreadyKnown`, and `privacyConcern`.
- Focused integration coverage was added to the scheduled-task API test so generated artifacts can be listed, inspected, accepted, ignored, and archived through the HTTP API.

Files likely touched:

- `apps/api/src/server.mjs`
- `packages/ai-orchestrator/src/artifact-inbox.mjs`
- `tests/integration/api-vault-settings.test.mjs` or a new AI API test

Acceptance:

- List pending artifacts.
- Archive/accept/ignore artifact.
- Persist user decisions.
- Persist feedback signals on decisions.
- Keep provenance visible.

### Slice C: LinkSuggestion Acceptance

Status:

- First implementation slice completed in `apps/api/src/server.mjs` and `packages/domain/src/note-catalog-store.mjs`.
- `POST /api/v1/ai/inbox/:artifactId/accept-link` requires `confirm: true`, validates that the artifact is a note-to-note `LinkSuggestion`, writes an explicit note relation, and records a `linked_to_note` artifact decision.
- Integration coverage verifies confirmation gating, relation creation, artifact decision persistence, and duplicate-safe acceptance.

Files likely touched:

- Domain relation APIs/tools.
- Artifact decision/promote path.
- Integration tests.

Acceptance:

- Accepting a link suggestion creates a real relation.
- The source artifact remains traceable.
- No relation is written from background runs without explicit acceptance.

### Slice D: Graph-Aware Connection Context

Status:

- First implementation slice completed in `packages/ai-orchestrator/src/harness.mjs`.
- Runs can opt into `graphContext` / `includeGraphContext` to append `graph_neighborhood` context items beside selected/search-matched notes.
- Graph context is gathered through the existing `list_note_relations` tool boundary and includes tags, outgoing links, and backlinks.
- `relation_scan` scheduled task inputs now enable graph context by default, while still writing only reviewable artifacts.
- Focused harness coverage verifies tags, outgoing links, backlinks, and context-index exposure.

Files likely touched:

- `packages/ai-orchestrator/src/harness.mjs`
- `packages/ai-orchestrator/src/scheduled-agent-tasks.mjs`
- `tests/unit/ai-orchestrator-harness.test.mjs`

Acceptance:

- Connection-agent context can include graph neighborhoods.
- Scheduled relation scans receive graph metadata for scoped notes.
- Graph context remains read-only and does not create note relations.

### Slice E: AI Inbox Web Surface

Status:

- First implementation slice completed in the web prototype.
- A new `AI Inbox` rail module lists reviewable artifacts with pending/reviewed/archived/all views, type/source/privacy filters, and detail panes.
- Detail view shows source notes, run/context/model/privacy provenance, payload/body preview, decisions, feedback flags, and guarded actions.
- The web slice also shows a compact evaluation band sourced from `GET /api/v1/ai/inbox/evaluation-summary`, scoped by the current type/source/privacy filters across all inbox views.
- Generic review decisions call the decision API and remain artifact-review events only.
- Note-to-note `LinkSuggestion` artifacts expose a guarded `Create note relation` action that calls the dedicated `accept-link` API; non-note endpoints are disabled in the UI.
- Focused web unit coverage was added for model normalization and renderer behavior.

Files likely touched:

- `apps/web/src/ai-inbox-model.js`
- `apps/web/src/ai-inbox-panel.js`
- `apps/web/src/prototype-api.js`
- `apps/web/src/prototype-app.js`
- `apps/web/src/prototype.html`
- `tests/unit/web-ai-inbox-model.test.mjs`
- `tests/unit/web-ai-inbox-panel.test.mjs`

Acceptance:

- User can open AI Inbox from the rail.
- User can filter artifact views and inspect artifact detail.
- User can see artifact/decision/feedback metrics without leaving AI Inbox.
- User can record accept/ignore/archive review decisions with feedback flags.
- User can open source notes from artifact detail.
- User can promote only note-to-note `LinkSuggestion` artifacts into real note relations.
- User can promote `QuestionCard` and `ReflectionPrompt` artifacts into draft notes through an explicit confirmation action.
- UI does not silently mutate notes or graph relations.

### Slice F: AI Evaluation Summary API

Status:

- First implementation slice completed in the API and AI inbox core.
- `createAiInbox().evaluationSummary()` aggregates artifact status/type/agent-run counts, latest and all decision counts, and feedback flags.
- `GET /api/v1/ai/inbox/evaluation-summary` exposes the summary for the active vault.
- The endpoint supports the same `view`, `type`, `sourceNoteId`, and `privacyMode` filters used by the AI Inbox list route.

Files likely touched:

- `packages/ai-orchestrator/src/artifact-inbox.mjs`
- `apps/api/src/server.mjs`
- `docs/API.md`
- `tests/unit/ai-artifact-inbox.test.mjs`
- `tests/integration/api-vault-settings.test.mjs`

Acceptance:

- Product can compute useful/noisy/wrong/already-known/privacy-concern counts and decision/agent/type distributions without scanning UI state.
- Summary can be scoped to all artifacts, a specific inbox view, artifact type, source note, or privacy mode.
- The API remains read-only and does not mutate artifacts, notes, or graph relations.

### Slice G: Question And Reflection Note Promotion

Status:

- First implementation slice completed in the API and web AI Inbox.
- `POST /api/v1/ai/inbox/:artifactId/promote-note` promotes `QuestionCard` and `ReflectionPrompt` artifacts into draft notes only after `confirm: true`.
- The promotion records a `promoted_to_note` artifact decision with the created note id.
- The web AI Inbox shows a guarded `Create draft note` action for eligible artifacts and disables it after promotion.

Files likely touched:

- `apps/api/src/server.mjs`
- `apps/web/src/ai-inbox-model.js`
- `apps/web/src/ai-inbox-panel.js`
- `apps/web/src/prototype-api.js`
- `apps/web/src/prototype-app.js`
- `docs/API.md`
- `tests/integration/api-vault-settings.test.mjs`
- `tests/unit/web-ai-inbox-model.test.mjs`
- `tests/unit/web-ai-inbox-panel.test.mjs`
- `tests/unit/web-prototype-api.test.mjs`

Acceptance:

- Generic review decisions still cannot record `promoted_to_note`.
- Missing confirmation is rejected before note creation.
- A promoted artifact creates exactly one draft note and preserves artifact/source provenance in the note body.
- Re-promoting the same artifact is blocked with the already-created note id.

### Slice H: Insight Artifact Types

Status:

- First implementation slice completed in the artifact schema and web AI Inbox model.
- `InsightCard`, `BridgeCard`, `TensionCard`, `SourceGap`, and `WritingMove` are now accepted reviewable artifact types.
- AI Inbox type filters expose these product-specific insight and writing artifact labels.
- Schema docs define the expected payload shape and preserve review-first promotion rules.

Files likely touched:

- `packages/ai-orchestrator/src/artifacts.mjs`
- `apps/web/src/ai-inbox-model.js`
- `docs/AI_ARTIFACT_SCHEMA_V1.md`
- `docs/API.md`
- `tests/unit/ai-orchestrator-harness.test.mjs`
- `tests/unit/web-ai-inbox-model.test.mjs`

Acceptance:

- Stores accept all five insight/writing artifact types as `pending_review` artifacts.
- AI Inbox can filter and label the five new artifact types.
- The change does not add any silent note, relation, or writing-project mutation path.

### Slice I: Writing Bridge Agent

Status:

- First implementation slice completed in the agent registry and prompt builder.
- `writing_bridge_agent` is available as a foreground-only agent.
- It emits reviewable `WritingMove`, `OutlineDraft`, or `SourceGap` artifacts and keeps `canWriteHumanNote` false.
- The prompt path tells the model to produce source-grounded writing support, not full essay text or silent draft edits.

Files likely touched:

- `packages/ai-orchestrator/src/agent-registry.mjs`
- `packages/ai-orchestrator/src/agent-prompts.mjs`
- `docs/AGENT_HARNESS_ARCHITECTURE_V1.md`
- `tests/unit/ai-orchestrator-harness.test.mjs`

Acceptance:

- Harness can run `writing_bridge_agent` and store a pending `WritingMove` artifact.
- The run preserves source note ids and AI Inbox review state.
- No note, relation, or writing project is mutated by the agent run.

### Slice J: Feedback Quality Rates

Status:

- First implementation slice completed in AI Inbox evaluation summary.
- Evaluation summary now reports quality buckets for overall artifacts, artifact type, agent run, and model tier.
- Each bucket includes review rate, acceptance rate, useful rate, noisy rate, wrong rate, and privacy-concern rate.
- The web AI Inbox evaluation band shows reviewed and accepted percentages alongside existing counts.

Files likely touched:

- `packages/ai-orchestrator/src/artifact-inbox.mjs`
- `apps/web/src/ai-inbox-model.js`
- `docs/API.md`
- `tests/unit/ai-artifact-inbox.test.mjs`
- `tests/unit/web-ai-inbox-model.test.mjs`

Acceptance:

- Product can evaluate artifact quality without scanning UI state.
- Accepted/promoted/linked artifacts count as accepted for acceptance-rate calculations.
- No model training, personalization, note mutation, or automated workflow change is introduced.

### Slice K: Scheduled Task Management UI

Status:

- First implementation slice completed in the Settings panel.
- Scheduled tasks can be listed with status/type filters, schedule, scope, budget, next run, last run, last reason, and agent run metadata.
- Users can pause or resume scheduled tasks through the existing status API.
- Users can manually run due scheduled tasks from the UI after an explicit confirmation prompt.
- Run results remain reviewable AI Inbox artifacts; the UI does not add any silent note, relation, or writing-project mutation path.

Files likely touched:

- `apps/web/src/scheduled-tasks-model.js`
- `apps/web/src/scheduled-tasks-panel.js`
- `apps/web/src/prototype-api.js`
- `apps/web/src/prototype-app.js`
- `apps/web/src/prototype.html`
- `tests/unit/web-scheduled-tasks-model.test.mjs`
- `tests/unit/web-scheduled-tasks-panel.test.mjs`
- `tests/unit/web-prototype-api.test.mjs`

Acceptance:

- Settings can show scheduled agent tasks without leaving the main app.
- Users can pause and resume tasks without deleting task configuration.
- Manual due-task execution requires a visible confirmation step.
- Generated outputs stay in AI Inbox and must still be reviewed before they affect notes or graph relations.

## 6. Do Not Build Yet

- Full autonomous vault-wide scanning.
- Direct AI edits to human-authored notes.
- One-click long-form article generation.
- Complex enterprise policy console.
- Raw provider/model selection in novice flows.

## 7. Decision To Preserve

The AI layer should act as a disciplined cognitive collaborator:

- It proposes.
- It cites what it read.
- It creates reviewable artifacts.
- It lets the user decide what becomes part of the knowledge base.
- It helps writing emerge from accepted notes and relations.
