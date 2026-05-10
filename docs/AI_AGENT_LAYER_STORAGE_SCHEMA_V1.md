# AI Agent Layer Storage Schema V1

> Status: draft storage schema
> Date: 2026-05-10
> Workstream: `feat/ai-agent-layer`
> Related: `AI_ARTIFACT_SCHEMA_V1.md`, `AGENT_RUN_LOG_SCHEMA_V1.md`, `CONTEXT_PACK_SCHEMA_V1.md`, `SCHEDULED_AGENT_TASKS_V1.md`

## 1. Purpose

This document defines the storage boundary for the AI / Agent layer.

The AI layer should persist its own operational records without polluting the core note model. Human-authored notes remain the primary knowledge objects. Agent outputs, run logs, context packs, scheduled tasks, provider settings, and user decisions should live in AI-owned tables or collections that reference notes by stable ids.

## 2. Storage Principles

- AI data should be separate from human-authored note content.
- AI artifacts can reference notes, but they should not become notes until the user explicitly promotes them.
- Run logs should record references and summaries by default, not full sensitive note text.
- Context Packs should store bounded content, references, hashes, or summaries according to privacy policy.
- Provider secrets should never be stored in normal app tables or logs.
- Every AI artifact should link back to an agent run.
- Every agent run should link to a task, context pack, model route, and tool events when available.
- Deleting a note should not silently delete audit history unless product policy explicitly requires it.

## 3. Storage Boundary

```text
Core Note Store
  notes
  sources
  projects
  graph links

AI Layer Store
  ai_artifacts
  ai_artifact_sources
  ai_artifact_decisions
  agent_runs
  agent_run_events
  context_packs
  context_pack_items
  scheduled_agent_tasks
  model_provider_configs
  user_ai_preferences
```

The AI Layer Store can share the same database file as the core note app in MVP, but it should use clearly separated tables and migration boundaries.

## 4. Logical Tables

### 4.1 `ai_artifacts`

Stores AI-generated output containers.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text primary key | Artifact id |
| `type` | text | ResearchCard, LinkSuggestion, ReflectionPrompt, etc. |
| `title` | text | User-visible title |
| `summary` | text | Short summary |
| `body_json` | json/text | Type-specific payload |
| `status` | text | pending_review, accepted, ignored, archived, promoted_to_note |
| `origin` | text | ai_generated, source_derived, mixed |
| `agent_run_id` | text | References `agent_runs.id` |
| `context_pack_id` | text nullable | References `context_packs.id` |
| `model_ref` | text | Safe provider/model reference |
| `model_tier` | text | router_fast, cheap_fast, standard, strong_reasoning |
| `privacy_mode` | text | normal, private_project, local_only, enterprise_restricted |
| `confidence_score` | real nullable | 0-1 |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### 4.2 `ai_artifact_sources`

Links artifacts to notes, source documents, other artifacts, or external URLs.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text primary key | |
| `artifact_id` | text | References `ai_artifacts.id` |
| `source_kind` | text | note, source_doc, artifact, project, external_url |
| `source_id` | text nullable | Stable id where available |
| `source_url` | text nullable | External URL |
| `source_pointer_json` | json/text nullable | Block/chunk/span reference |
| `included_reason` | text | current_note, semantic_match, citation, etc. |
| `created_at` | datetime | |

### 4.3 `ai_artifact_decisions`

Stores explicit user decisions about AI artifacts.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text primary key | |
| `artifact_id` | text | References `ai_artifacts.id` |
| `user_id` | text | |
| `decision` | text | accepted, revised, ignored, archived, promoted_to_note, linked_to_note |
| `target_kind` | text nullable | note, graph_edge, task, inbox |
| `target_id` | text nullable | |
| `comment` | text nullable | |
| `created_at` | datetime | |

### 4.4 `agent_runs`

Stores one record per agent execution.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text primary key | Agent run id |
| `task_id` | text | Task envelope id |
| `workspace_id` | text | |
| `user_id` | text nullable | Null for system runs if needed |
| `trigger` | text | user_command, editor_sidecar, scheduled_task, system |
| `agent_id` | text | |
| `agent_version` | text | |
| `task_type` | text | research, reflection, synthesis, relation_discovery |
| `status` | text | queued, running, succeeded, failed, canceled, partial |
| `user_mode` | text | Auto, Economy, Balanced, Deep Thinking, Local / Private |
| `privacy_mode` | text | |
| `context_pack_id` | text nullable | |
| `provider_id` | text nullable | |
| `model_ref` | text nullable | |
| `model_tier` | text nullable | |
| `input_tokens` | integer nullable | |
| `output_tokens` | integer nullable | |
| `estimated_cost` | real nullable | |
| `cost_currency` | text nullable | |
| `error_type` | text nullable | |
| `error_message` | text nullable | Safe user-visible message |
| `started_at` | datetime nullable | |
| `ended_at` | datetime nullable | |
| `created_at` | datetime | |

### 4.5 `agent_run_events`

Stores model calls, tool calls, fallback events, guardrail events, artifact events, and user confirmations.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text primary key | |
| `agent_run_id` | text | References `agent_runs.id` |
| `event_type` | text | model_call, tool_call, fallback, guardrail, artifact_created, user_confirmation |
| `event_order` | integer | Stable ordering inside run |
| `status` | text | succeeded, failed, blocked, retried, etc. |
| `summary_json` | json/text | Non-sensitive event summary |
| `usage_json` | json/text nullable | Token/cost info |
| `error_json` | json/text nullable | Normalized error |
| `started_at` | datetime nullable | |
| `ended_at` | datetime nullable | |
| `created_at` | datetime | |

### 4.6 `context_packs`

Stores Context Pack envelope and policy metadata.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text primary key | Context Pack id |
| `task_id` | text | |
| `agent_run_id` | text nullable | |
| `task_type` | text | |
| `agent_id` | text | |
| `trigger` | text | |
| `privacy_mode` | text | |
| `cloud_allowed` | boolean | |
| `redactions_applied` | boolean | |
| `target_input_tokens` | integer | |
| `estimated_input_tokens` | integer | |
| `item_count` | integer | |
| `omitted_count` | integer | |
| `summary` | text nullable | Safe summary |
| `created_at` | datetime | |
| `expires_at` | datetime nullable | Optional retention |

### 4.7 `context_pack_items`

Stores Context Pack items or references.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text primary key | |
| `context_pack_id` | text | References `context_packs.id` |
| `kind` | text | note, source_doc, artifact, project, graph_relation, preference |
| `source_id` | text | |
| `title` | text nullable | If allowed |
| `content_ref` | text nullable | Reference to encrypted/local content blob if stored |
| `content_hash` | text nullable | Hash for audit without storing content |
| `summary` | text nullable | Safe bounded summary |
| `origin` | text | human_authored, ai_generated, source_derived, etc. |
| `included_reason` | text | |
| `relevance_score` | real nullable | |
| `privacy_mode` | text | |
| `redacted` | boolean | |
| `token_estimate` | integer nullable | |
| `created_at` | datetime | |

### 4.8 `context_pack_omissions`

Stores items intentionally omitted from a Context Pack.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text primary key | |
| `context_pack_id` | text | |
| `source_kind` | text | |
| `source_id` | text | |
| `reason` | text | privacy_blocked, token_budget, low_relevance, duplicate, user_excluded |
| `score` | real nullable | |
| `created_at` | datetime | |

### 4.9 `scheduled_agent_tasks`

Stores recurring tasks.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text primary key | |
| `name` | text | |
| `status` | text | active, paused, disabled, failed |
| `task_type` | text | research_scan, relation_scan, project_digest, reflection_prompt |
| `agent_id` | text | |
| `schedule_json` | json/text | Frequency, timezone, time |
| `scope_json` | json/text | Sources, projects, keywords |
| `model_policy_json` | json/text | User mode, max tier |
| `budget_json` | json/text | Runs/cost caps |
| `privacy_json` | json/text | Cloud/private rules |
| `output_json` | json/text | Destination and notification |
| `last_run_id` | text nullable | References `agent_runs.id` |
| `next_run_at` | datetime nullable | |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### 4.10 `model_provider_configs`

Stores provider descriptors and non-secret configuration.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text primary key | Provider config id |
| `provider_id` | text | openai, openrouter, local_ollama, etc. |
| `adapter_type` | text | direct_provider, aggregated_gateway, self_hosted_gateway, local_gateway |
| `status` | text | enabled, disabled, experimental |
| `auth_mode` | text | platform_managed, workspace_managed, byok_advanced, local_no_key, enterprise_secret |
| `secret_ref` | text nullable | Reference only, never raw secret |
| `endpoint_url` | text nullable | For compatible/local gateways |
| `capabilities_json` | json/text | Provider-level capabilities |
| `model_map_json` | json/text | Tier to model mapping |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### 4.11 `user_ai_preferences`

Stores user-level AI settings.

| Column | Type | Notes |
| --- | --- | --- |
| `user_id` | text primary key | |
| `workspace_id` | text | |
| `user_mode` | text | Auto, Economy, Balanced, Deep Thinking, Local / Private |
| `model_pack` | text | Starter Auto, Privacy First, etc. |
| `monthly_budget` | real nullable | |
| `confirmation_threshold` | real nullable | |
| `fallback_policy_json` | json/text | |
| `advanced_settings_json` | json/text nullable | |
| `created_at` | datetime | |
| `updated_at` | datetime | |

## 5. Suggested Indexes

Suggested indexes:

- `ai_artifacts(status, created_at)`
- `ai_artifacts(type, status)`
- `ai_artifacts(agent_run_id)`
- `ai_artifact_sources(source_kind, source_id)`
- `ai_artifact_decisions(artifact_id, created_at)`
- `agent_runs(status, created_at)`
- `agent_runs(agent_id, created_at)`
- `agent_runs(trigger, created_at)`
- `agent_run_events(agent_run_id, event_order)`
- `context_packs(agent_run_id)`
- `context_pack_items(context_pack_id)`
- `scheduled_agent_tasks(status, next_run_at)`

## 6. Retention Defaults

| Data | Default Retention | Notes |
| --- | --- | --- |
| AI artifacts | Long-term until user deletes | User-facing product data |
| Artifact decisions | Long-term | Needed for provenance |
| Agent run summary | Long-term | Cost/trust/debugging |
| Agent run events | Medium/long-term | Can be compacted |
| Context Pack envelope | Medium-term | Useful for audit |
| Context Pack item exact content | Short-term or off | Prefer hashes/refs |
| Scheduled task config | Until deleted | User configuration |
| Provider config | Until disabled/deleted | No raw secrets |

## 7. Deletion and Privacy Rules

Deletion rules:

- Deleting an AI artifact should not delete source notes.
- Deleting a note should mark artifact source references as dangling or redacted.
- User should be able to delete AI artifacts and scheduled tasks.
- Enterprise policy may require deleting run logs after a retention window.
- `local_only` content should not be synced to cloud logs.

Secret rules:

- Raw provider keys never live in these tables.
- Use OS keychain, cloud secret manager, or enterprise secret store.
- Run logs store `secret_ref` only when needed and allowed.

## 8. MVP Storage Scope

MVP should implement:

- `ai_artifacts`
- `ai_artifact_sources`
- `ai_artifact_decisions`
- `agent_runs`
- `agent_run_events`
- `context_packs`
- `context_pack_items`
- `scheduled_agent_tasks`
- `model_provider_configs`
- `user_ai_preferences`

MVP can defer:

- `context_pack_omissions` as a separate table if omissions are stored in JSON initially.
- Full encrypted prompt/output blob storage.
- Enterprise audit export tables.
- Provider health history tables.
- Automated eval result tables.

## 9. Open Questions

- Should AI tables live in the same SQLite database as notes for local-first MVP?
- Should run logs sync across devices?
- Should Context Pack content be stored exactly, summarized, hashed, or not stored?
- How should dangling references behave after notes are deleted?
- Should user AI preferences be per workspace, per vault, or global?
- Should scheduled tasks be disabled automatically when provider config is removed?

