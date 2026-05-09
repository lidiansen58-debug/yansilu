# Agent Run Log Schema V1

> Status: draft schema
> Date: 2026-05-09
> Workstream: `feat/ai-agent-layer`
> Related: `AGENT_HARNESS_ARCHITECTURE_V1.md`, `CONTEXT_PACK_SCHEMA_V1.md`, `AI_ARTIFACT_SCHEMA_V1.md`, `MODEL_ROUTING_POLICY_V1.md`

## 1. Purpose

Agent Run Log records what happened during every AI / Agent run.

It supports:

- User trust: show what the agent read and produced.
- Cost control: track tokens, provider, model, and estimated cost.
- Debugging: inspect tools, errors, retries, and fallbacks.
- Provenance: connect artifacts to source notes, source documents, context, and model output.
- Evaluation: compare model/provider quality and reliability over time.

The Run Log should be product infrastructure, not developer-only console output.

## 2. Logging Principles

- Every agent run gets one run record.
- Every model call, tool call, fallback, generated artifact, and user confirmation should be linked to the run.
- Logs should store summaries and references by default, not full sensitive note text.
- Full prompts or full context should be stored only when privacy policy allows it.
- Logs must never bypass `local_only` or enterprise data restrictions.
- Users should be able to understand high-level run activity without seeing technical noise.
- Developers/admins should be able to inspect deeper traces when permitted.

## 3. Run Record

```json
{
  "agent_run_id": "run_01",
  "task_id": "task_01",
  "workspace_id": "workspace_01",
  "user_id": "user_01",
  "status": "queued | running | succeeded | failed | canceled | partial",
  "trigger": "user_command | editor_sidecar | scheduled_task | system",
  "agent": {
    "agent_id": "research_agent",
    "agent_version": "v1"
  },
  "task": {
    "task_type": "research | relation_discovery | reflection | synthesis | writing_support | originality_check",
    "risk_level": "low | medium | high | critical",
    "background_allowed": true
  },
  "user_mode": "Auto | Economy | Balanced | Deep Thinking | Local / Private",
  "privacy": {
    "mode": "normal | private_project | local_only | enterprise_restricted",
    "cloud_allowed": true,
    "confirmation_required": false
  },
  "context": {
    "context_pack_id": "ctx_01",
    "included_item_count": 8,
    "omitted_item_count": 3,
    "estimated_input_tokens": 7600
  },
  "model_route": {
    "provider_id": "openai",
    "model": "model_id",
    "tier": "standard",
    "adapter_type": "direct_provider",
    "fallback_used": false
  },
  "usage": {
    "input_tokens": 1000,
    "output_tokens": 500,
    "cached_input_tokens": 0,
    "total_tokens": 1500,
    "estimated_cost": 0.01,
    "currency": "USD"
  },
  "artifacts": {
    "created_artifact_ids": ["artifact_01"],
    "artifact_types": ["ResearchCard"]
  },
  "timing": {
    "queued_at": "iso_datetime",
    "started_at": "iso_datetime",
    "ended_at": "iso_datetime",
    "duration_ms": 4200
  },
  "error": null
}
```

## 4. Model Call Event

One run may include multiple model calls.

```json
{
  "event_id": "evt_model_01",
  "agent_run_id": "run_01",
  "event_type": "model_call",
  "started_at": "iso_datetime",
  "ended_at": "iso_datetime",
  "provider_id": "openai",
  "model": "model_id",
  "model_tier": "standard",
  "adapter_type": "direct_provider",
  "purpose": "task_routing | context_compression | agent_reasoning | guardrail | output_repair",
  "input_summary": "short non-sensitive summary",
  "output_summary": "short non-sensitive summary",
  "usage": {
    "input_tokens": 1000,
    "output_tokens": 500,
    "estimated_cost": 0.01
  },
  "status": "succeeded | failed | retried",
  "error": null
}
```

Prompt and raw output storage policy:

```json
{
  "store_full_prompt": false,
  "store_full_output": false,
  "prompt_ref": "optional encrypted or local reference",
  "output_ref": "optional encrypted or local reference"
}
```

## 5. Tool Call Event

```json
{
  "event_id": "evt_tool_01",
  "agent_run_id": "run_01",
  "event_type": "tool_call",
  "tool_name": "search_notes",
  "permission_level": "read_public | read_note | read_source | write_ai_artifact | write_suggestion | request_confirmation | write_human_note",
  "input_summary": {
    "query": "string",
    "limit": 20
  },
  "output_summary": {
    "result_count": 8,
    "source_ids": ["note_01", "note_02"]
  },
  "privacy_mode": "normal",
  "status": "succeeded | failed | blocked | retried",
  "duration_ms": 120,
  "error": null
}
```

Sensitive rule:

- Do not store full note content in tool call logs by default.
- Store ids, counts, snippets, or hashes instead.

## 6. Fallback Event

```json
{
  "event_id": "evt_fallback_01",
  "agent_run_id": "run_01",
  "event_type": "fallback",
  "reason": "provider_unavailable | rate_limit | timeout | capability_mismatch | validation_failed | budget_constraint | region_blocked",
  "from": {
    "provider_id": "provider_a",
    "model": "model_a",
    "tier": "standard"
  },
  "to": {
    "provider_id": "provider_b",
    "model": "model_b",
    "tier": "standard"
  },
  "allowed_by_policy": true,
  "user_confirmation_required": false,
  "status": "succeeded | failed | skipped"
}
```

Fallback must never override privacy policy.

## 7. Guardrail Event

```json
{
  "event_id": "evt_guardrail_01",
  "agent_run_id": "run_01",
  "event_type": "guardrail",
  "guardrail_type": "privacy | originality | cost | permission | schema_validation",
  "decision": "allowed | blocked | requires_confirmation | repaired",
  "reason": "string",
  "related_ids": ["note_01", "artifact_01"]
}
```

## 8. Artifact Event

```json
{
  "event_id": "evt_artifact_01",
  "agent_run_id": "run_01",
  "event_type": "artifact_created",
  "artifact_id": "artifact_01",
  "artifact_type": "ResearchCard",
  "status": "pending_review",
  "source_note_ids": ["note_01"],
  "source_doc_ids": ["source_01"]
}
```

## 9. User Confirmation Event

```json
{
  "event_id": "evt_confirm_01",
  "agent_run_id": "run_01",
  "event_type": "user_confirmation",
  "reason": "expensive_run | cloud_fallback | write_human_note | promote_ai_artifact | read_private_note",
  "summary": "string",
  "decision": "approved | canceled | expired",
  "decided_at": "iso_datetime"
}
```

## 10. Error Shape

```json
{
  "error_type": "privacy_blocked | permission_denied | provider_error | model_error | validation_error | tool_error | budget_exceeded | user_canceled | unknown",
  "error_code": "string",
  "message": "safe user-visible message",
  "developer_message": "optional internal detail",
  "retryable": true,
  "provider_status_code": 429
}
```

## 11. User-Visible Run Summary

Novice users should see a simple summary:

```json
{
  "title": "Created 3 link suggestions",
  "summary": "The agent compared the current note with 8 related notes and created 3 suggestions.",
  "used_sources": [
    {
      "kind": "note",
      "title": "string",
      "id": "note_01"
    }
  ],
  "model_mode": "Auto",
  "estimated_cost_label": "Included in plan | Low | Medium | High",
  "artifacts_created": ["artifact_01"],
  "needs_attention": false
}
```

Do not show raw provider errors, token tables, or model ids to novice users unless they open advanced details.

## 12. Admin / Developer Run Detail

Admin/developer detail can include:

- Provider id.
- Model id.
- Model tier.
- Adapter type.
- Token usage.
- Estimated cost.
- Tool call list.
- Fallback chain.
- Error codes.
- Latency.
- Validation failures.
- Context Pack references.

Access to full prompts, full outputs, and raw context must respect privacy and deployment policy.

## 13. Retention Policy

Suggested retention:

| Data | Default Retention | Notes |
| --- | --- | --- |
| Run summary | Long-term | Useful for trust and analytics |
| Usage and cost | Long-term | Needed for billing and budgets |
| Tool call summaries | Medium/long-term | Useful for debugging |
| Full prompts | Off by default | Store only with permission |
| Full outputs | Off by default unless artifact | Artifacts are stored separately |
| Context Pack exact text | Short-term or off | Prefer references/hashes |
| Errors | Medium/long-term | Remove sensitive payloads |

## 14. MVP Requirements

MVP Run Log must record:

- Run id.
- Task id.
- Agent id.
- Trigger.
- Status.
- Context Pack id.
- Provider id.
- Model id or safe model reference.
- Model tier.
- User mode.
- Tool calls.
- Created artifact ids.
- Token usage when available.
- Estimated cost when available.
- Fallback events.
- Guardrail decisions.
- Error state.
- Started/ended timestamps.

MVP can defer:

- Full prompt archival.
- Full trace UI.
- Automated model quality scoring.
- Fine-grained span-level provenance.

## 15. Open Questions

- Should run logs be stored locally, in cloud, or both?
- Should users be able to delete run logs independently from notes?
- Should run logs be exported for enterprise audit?
- How should cost be displayed when provider cost data is unavailable?
- How much tracing should be exposed in the normal UI?
- Should scheduled background runs have stricter retention than user-triggered runs?

