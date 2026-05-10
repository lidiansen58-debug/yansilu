# Agent Harness Architecture V1

> Status: draft architecture
> Date: 2026-05-09
> Workstream: `feat/ai-agent-layer`
> Related: `AI_AGENT_LAYER_REQUIREMENTS_V1.md`, `MODEL_ROUTING_POLICY_V1.md`, `AI_TOOL_CONTRACTS_V1.md`, `AI_ARTIFACT_SCHEMA_V1.md`

## 1. Purpose

The Agent Harness is the control layer around the OpenAI Agents SDK and model provider adapters.

It is responsible for:

- Receiving user-triggered and scheduled AI tasks.
- Building safe, bounded Context Packs.
- Selecting the right agent and model policy.
- Executing the agent run.
- Calling note app tools through stable contracts.
- Recording trace, usage, cost, and provenance.
- Writing outputs as AI artifacts.
- Keeping AI work separate from human-authored notes unless the user explicitly accepts it.

The harness should be treated as product infrastructure, not just SDK wrapper code.

## 2. Architecture Overview

```text
User Action / Scheduler / System Trigger
  -> Task Intake
  -> Privacy Gate
  -> Task Router
  -> Context Builder
  -> Agent Registry
  -> Model Policy
  -> Provider Adapter
  -> OpenAI Agents SDK Runner
  -> Tool Layer
  -> AI Artifact Store
  -> Run Log / Trace / Usage Store
  -> User Review / Acceptance Flow
```

## 3. Core Modules

### 3.1 Task Intake

Normalizes triggers into a single task envelope.

Task sources:

- User command.
- Editor sidecar action.
- Selected note or selected text.
- Scheduled research task.
- Scheduled connection scan.
- Project digest trigger.
- System maintenance task.

Task envelope:

```json
{
  "task_id": "task_01",
  "trigger": "user_command | editor_sidecar | scheduled_task | system",
  "requested_action": "string",
  "user_mode": "Auto",
  "workspace_id": "workspace_01",
  "user_id": "user_01",
  "scope": {
    "note_ids": ["note_01"],
    "source_doc_ids": [],
    "project_ids": []
  },
  "created_at": "iso_datetime"
}
```

### 3.2 Privacy Gate

Runs before retrieval and model selection.

Responsibilities:

- Determine whether the task can read note content.
- Determine whether cloud models are allowed.
- Determine whether local/private model mode is required.
- Reject or request confirmation for sensitive scopes.

Privacy gate output:

```json
{
  "privacy_mode": "normal | private_project | local_only | enterprise_restricted",
  "cloud_allowed": true,
  "requires_confirmation": false,
  "blocked_reason": null
}
```

### 3.3 Task Router

Classifies the task and chooses the agent family.

Outputs:

- Task type.
- Risk level.
- Agent id.
- Required capabilities.
- Expected artifact type.
- Whether the task can run in background.

Example:

```json
{
  "task_type": "relation_discovery",
  "risk_level": "low",
  "agent_id": "connection_agent",
  "required_capabilities": ["structured_output"],
  "expected_artifact_type": "LinkSuggestion",
  "background_allowed": true
}
```

### 3.4 Context Builder

Builds a bounded Context Pack from the note app and source stores.

Inputs:

- Current note.
- User-selected notes.
- Search results.
- Source documents.
- Existing graph links.
- Project metadata.
- Recent activity.

Context Pack:

```json
{
  "context_pack_id": "ctx_01",
  "task_id": "task_01",
  "privacy_mode": "normal",
  "items": [
    {
      "kind": "note",
      "id": "note_01",
      "title": "string",
      "content": "bounded text",
      "origin": "human_authored",
      "included_reason": "current_note"
    }
  ],
  "omitted": [
    {
      "id": "note_99",
      "reason": "privacy_blocked | budget_limit | relevance_low"
    }
  ],
  "token_budget": {
    "target_input_tokens": 12000,
    "estimated_input_tokens": 7600
  }
}
```

### 3.5 Agent Registry

Stores declarative agent definitions.

Definition:

```json
{
  "agent_id": "research_agent",
  "purpose": "Read sources and create research artifacts.",
  "default_model_tier": "standard",
  "allowed_tools": ["read_source_doc", "search_notes", "create_ai_artifact"],
  "output_artifact_types": ["ResearchCard", "SourceSummary"],
  "can_run_in_background": true,
  "can_write_human_note": false
}
```

### 3.6 Model Policy

Chooses a model tier, provider, and concrete model through the routing policy.

Inputs:

- User mode.
- Task profile.
- Required capabilities.
- Privacy mode.
- Budget state.
- Provider health.
- Workspace policy.

Output:

```json
{
  "provider_id": "openai",
  "model": "model_id",
  "tier": "standard",
  "fallback_chain": ["aggregated_gateway:standard", "openai:cheap_fast"],
  "requires_cost_confirmation": false
}
```

### 3.7 Provider Adapter

Normalizes provider-specific execution.

Responsibilities:

- Direct OpenAI integration.
- OpenAI-compatible gateway calls.
- Aggregated gateway calls.
- Local/private gateway calls.
- Error normalization.
- Usage normalization.
- Capability checks.

The adapter should return normalized usage and error objects to the Run Log.

### 3.8 SDK Runner

Executes agent runs through the OpenAI Agents SDK where possible.

Responsibilities:

- Instantiate agent with instructions, tools, output type, guardrails, and model config.
- Run the agent.
- Stream events if the UI needs them.
- Handle tool calls through the Tool Layer.
- Capture tracing data.
- Return structured output for artifact creation.

### 3.9 Tool Layer

Implements `AI_TOOL_CONTRACTS_V1.md`.

The harness should pass tools into agents with permission boundaries based on:

- Agent definition.
- Task type.
- Privacy gate.
- User confirmation.
- Background versus foreground execution.

### 3.10 AI Artifact Writer

Converts agent output into validated AI artifacts.

Responsibilities:

- Validate artifact schema.
- Attach run id, model ref, sources, privacy mode, and provenance.
- Store artifact in pending review state.
- Reject direct human note mutation.

### 3.11 Run Log / Trace / Usage Store

Records every run.

Run record:

```json
{
  "agent_run_id": "run_01",
  "task_id": "task_01",
  "agent_id": "research_agent",
  "status": "succeeded | failed | canceled | partial",
  "provider_id": "openai",
  "model": "model_id",
  "model_tier": "standard",
  "user_mode": "Auto",
  "context_pack_id": "ctx_01",
  "tool_calls": [],
  "usage": {
    "input_tokens": 1000,
    "output_tokens": 500,
    "estimated_cost": 0.01
  },
  "fallbacks": [],
  "created_artifact_ids": ["artifact_01"],
  "started_at": "iso_datetime",
  "ended_at": "iso_datetime"
}
```

## 4. Runtime Flows

### 4.1 User-Triggered Reflection

```text
User selects note
  -> Task Intake
  -> Privacy Gate
  -> Task Router selects Reflection Agent
  -> Context Builder includes current note and related notes
  -> Model Policy selects strong_reasoning if budget allows
  -> SDK Runner executes
  -> Artifact Writer creates ReflectionPrompt or SynthesisDraft
  -> User reviews artifact
```

### 4.2 Scheduled Research

```text
Scheduler triggers source scan
  -> Task Intake
  -> Privacy Gate checks source scope
  -> Task Router selects Research Agent
  -> Context Builder includes source chunks and related notes
  -> Model Policy selects standard tier with scheduled budget cap
  -> SDK Runner executes
  -> Artifact Writer creates ResearchCard
  -> Inbox receives pending artifact
```

### 4.3 Background Connection Discovery

```text
Scheduler or note update triggers scan
  -> Task Intake
  -> Privacy Gate
  -> Task Router selects Connection Agent
  -> Context Builder retrieves candidate related notes
  -> Model Policy selects cheap_fast or standard
  -> SDK Runner executes
  -> Artifact Writer creates LinkSuggestion
  -> User can accept or ignore
```

## 5. Failure Handling

Failure categories:

- Privacy blocked.
- Missing tool permission.
- Provider unavailable.
- Model capability mismatch.
- Budget exceeded.
- Structured output validation failed.
- Tool call failed.
- User confirmation canceled.

MVP behavior:

- Store failure in Run Log.
- Show plain-language message for foreground tasks.
- Retry only safe transient failures.
- Fallback only when privacy and budget policy allow.
- Never silently promote partial output into notes.

## 6. Scheduling Model

Scheduled tasks should use the same harness as user-triggered tasks.

Scheduled task record:

```json
{
  "scheduled_task_id": "sched_01",
  "name": "Weekly paper scan",
  "agent_id": "research_agent",
  "source_scope": {
    "feed_ids": ["feed_01"],
    "keywords": ["agent", "note-taking"]
  },
  "schedule": "weekly",
  "budget": {
    "max_runs_per_period": 1,
    "max_estimated_cost_per_period": 1.0
  },
  "output_destination": "research_inbox",
  "requires_confirmation": false
}
```

## 7. MVP Harness Scope

MVP modules:

- Task Intake.
- Privacy Gate.
- Task Router.
- Context Builder.
- Agent Registry.
- Model Policy.
- Provider Adapter with direct OpenAI plus one OpenAI-compatible adapter.
- SDK Runner.
- Tool Layer for MVP tools.
- Artifact Writer.
- Run Log.

MVP flows:

- User-triggered reflection.
- Scheduled research card generation.
- Background link suggestion.

Out of scope for MVP:

- Direct human note mutation by agents.
- Full enterprise policy console.
- Fully automated model evaluation.
- Deep UI for trace inspection.

## 8. Open Questions

- Should the harness run in the desktop app, backend service, worker process, or all three depending on deployment?
- Which parts of tracing are stored locally versus cloud-side?
- Should scheduled tasks run when the desktop app is closed?
- How will provider keys be injected into local runs securely?
- What is the first implementation language boundary for the harness?
- Should Context Packs be stored permanently, temporarily, or only as hashed references?
