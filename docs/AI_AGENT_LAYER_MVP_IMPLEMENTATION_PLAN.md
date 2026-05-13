# AI Agent Layer MVP Implementation Plan

> Status: draft implementation plan
> Date: 2026-05-09
> Workstream: `feat/ai-agent-layer`
> Related: `AI_AGENT_LAYER_WORKSTREAM_FRAMEWORK_V1.md`, `AGENT_HARNESS_ARCHITECTURE_V1.md`

## 1. Purpose

This plan describes how to implement the AI / Agent layer after the core note-recording MVP is stable enough to expose APIs.

Current product focus remains core note capture and organization. This plan should wait behind that priority and proceed through contracts and small prototypes.

## 2. Implementation Strategy

Use a staged approach:

```text
Stage 0: Contracts and architecture
Stage 1: Harness skeleton and run log
Stage 2: Context Pack and tool boundary
Stage 3: First user-triggered agent
Stage 4: Model provider adapter and routing
Stage 5: Scheduled research and link suggestions
Stage 6: Product hardening and evaluation
```

The implementation should avoid direct note mutation until originality and artifact boundaries are stable.

## 2.1 Infrastructure Priority Update 2026-05-13

Related: `AI_AGENT_INFRASTRUCTURE_NEXT_STEPS_2026-05-13.md`

After the first scheduled-task and provider-config slices, the most important gap is no longer "can an agent run?" but "can agent outputs become reviewable, useful product objects?"

Priority order:

1. Local Worker Scheduler: automatically run due scheduled tasks using the same SQLite stores and core note tools used by the API path.
2. AI Inbox and Review Workflow: list artifacts, record decisions, accept/archive/ignore, and show provenance.
3. LinkSuggestion Acceptance: turn accepted relationship suggestions into real note relations with explicit user confirmation.
4. Graph-Aware Connection Agent: first context-enrichment slice is implemented for backlinks, outgoing links, tags, directory scope, and graph-neighborhood metadata.
5. Insight Artifact Types: formalize `InsightCard`, `BridgeCard`, `TensionCard`, `SourceGap`, and `WritingMove`.
6. Writing Bridge Agent: turn selected notes into source-grounded outline/scaffold artifacts, not full auto-written essays.
7. Feedback and Evaluation Loop: track accepted/noisy/wrong artifacts by agent, model tier, scope, and task type.

Do not prioritize broad vault-wide background scanning or direct AI editing of human-authored notes.

## 3. Stage 0: Contracts and Architecture

Status: mostly drafted in this workstream.

Inputs:

- `AI_AGENT_LAYER_REQUIREMENTS_V1.md`
- `AGENT_HARNESS_ARCHITECTURE_V1.md`
- `AI_TOOL_CONTRACTS_V1.md`
- `AI_ARTIFACT_SCHEMA_V1.md`
- `CONTEXT_PACK_SCHEMA_V1.md`
- `AGENT_RUN_LOG_SCHEMA_V1.md`
- `MODEL_ROUTING_POLICY_V1.md`

Exit criteria:

- Core team agrees on minimum tool contracts.
- AI artifacts remain separate from notes.
- Context Pack shape is accepted.
- Run Log requirements are accepted.

## 4. Stage 1: Harness Skeleton and Run Log

Goal:

- Create the internal Agent Harness package without deeply coupling to the UI.

Build:

- Task Intake.
- Agent Registry.
- Run Log store.
- Minimal model call abstraction.
- Fake/mock provider for local testing.
- Artifact validation placeholder.

Validation:

- Run a fake agent task.
- Store run status, timing, tool calls, and artifacts.
- Confirm no note mutation path exists.

## 5. Stage 2: Context Pack and Tool Boundary

Goal:

- Connect the harness to stable note APIs through tools.

Build:

- `search_notes` adapter.
- `read_note` adapter.
- `read_source_doc` adapter if source docs are available.
- Context Builder for current note and selected notes.
- Privacy mode field.
- Token estimate field.
- Omitted item logging.

Validation:

- Build Context Pack from one current note.
- Build Context Pack from selected notes.
- Verify private/local-only policy blocks cloud route.
- Verify logs show included and omitted sources.

## 6. Stage 3: First User-Triggered Agent

Goal:

- Ship a narrow foreground agent flow before background automation.

Recommended first agent:

- Reflection Agent or Connection Agent.

Why:

- It demonstrates AI value without requiring broad source ingestion.
- It can operate on selected/current notes.
- It produces artifacts instead of editing notes.

Build:

- Agent definition.
- Prompt/instructions.
- Structured output validation.
- Artifact Writer.
- User review UI placeholder or inbox entry.

Validation:

- User selects a note.
- Agent creates `ReflectionPrompt` or `LinkSuggestion`.
- Artifact is visible as pending review.
- User can accept, ignore, or archive.

## 7. Stage 4: Model Provider Adapter and Routing

Goal:

- Make model switching flexible underneath and simple above.

Build:

- Direct OpenAI adapter.
- One OpenAI-compatible aggregated gateway adapter.
- Model Policy with tiers.
- User modes: `Auto`, `Economy`, `Balanced`, `Deep Thinking`, `Local / Private`.
- Budget precheck.
- Fallback event logging.

Validation:

- Same agent can run through two provider paths.
- Model ids are hidden from novice UI.
- Advanced setting can override provider/model.
- Budget limit blocks expensive run or asks confirmation.
- Fallback is logged.

## 8. Stage 5: Scheduled Research and Link Suggestions

Goal:

- Add controlled background intelligence.

Build:

- Scheduled task records.
- Weekly Research Scan template.
- Weekly Link Suggestions template.
- Budget caps.
- Privacy gates.
- Research Inbox / AI Inbox output.
- Quiet notification policy.

Validation:

- Scheduled task runs with test sources.
- Creates `ResearchCard` or `LinkSuggestion`.
- Run Log records usage and output.
- Task can be paused/resumed/deleted.
- Budget cap stops task.

## 9. Stage 6: Product Hardening and Evaluation

Goal:

- Make the system reliable enough for broader users.

Build:

- Provider capability tests.
- Model quality eval samples.
- Chinese note summarization eval.
- English paper summarization eval.
- Mixed-language synthesis eval.
- Artifact usefulness feedback.
- Error and fallback dashboards.

Validation:

- Regressions are visible.
- Provider failures are understandable.
- Model switching does not silently reduce quality.
- Cost can be explained to users.

## 10. MVP Deliverables

MVP should include:

- Agent Harness skeleton.
- OpenAI Agents SDK integration.
- Direct OpenAI provider.
- One OpenAI-compatible provider or gateway adapter.
- Agent Registry.
- Model Policy.
- Context Pack Builder.
- Run Log.
- AI Artifact Store.
- Reflection or Connection Agent.
- Weekly Research Scan or Link Suggestions.
- Simple model mode selector.
- Platform-managed AI path, if billing/product strategy supports it.

MVP should exclude:

- Direct AI editing of human-authored notes.
- Broad background scanning of the whole vault.
- Complex enterprise policy console.
- Full local model setup unless privacy-first users are the launch target.
- Raw model/provider selection in novice onboarding.

## 11. Dependencies on Core Note MVP

Needed from core note product:

- Stable note ids.
- Stable note read API.
- Search API or search index.
- Source document read API if research tasks are included.
- AI artifact storage location or extension point.
- User decision/action storage.
- Basic privacy metadata or default privacy policy.
- UI entry point for AI Inbox or sidecar suggestions.

## 12. Validation Checklist

Before merging AI implementation into main:

- Agent outputs are artifacts, not direct note edits.
- Every run has a Run Log.
- Every artifact has provenance.
- Context Pack is bounded and logged.
- Privacy gate runs before model routing.
- Budget gate runs before scheduled tasks.
- Novice users can use `Auto` without provider setup.
- BYOK is advanced-only.
- Fallbacks are explicit and logged.
- Tests cover at least one successful and one failed run.

## 13. Open Questions

- Should the first real agent be Reflection Agent or Connection Agent?
- Should the first scheduled task be Research Scan or Link Suggestions?
- Should the harness live in a backend service, worker app, desktop process, or shared package?
- What is the first storage backend for run logs and artifacts?
- Does platform-managed AI ship before or after BYOK?
- Which provider adapter should be implemented second after OpenAI direct?
