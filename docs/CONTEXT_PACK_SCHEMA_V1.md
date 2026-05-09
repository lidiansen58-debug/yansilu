# Context Pack Schema V1

> Status: draft schema
> Date: 2026-05-09
> Workstream: `feat/ai-agent-layer`
> Related: `AGENT_HARNESS_ARCHITECTURE_V1.md`, `AI_TOOL_CONTRACTS_V1.md`, `MODEL_ROUTING_POLICY_V1.md`

## 1. Purpose

A Context Pack is the bounded package of information passed to an agent run.

The model should not freely access the whole note vault. The Context Builder should assemble only the information needed for the task, within privacy and token budgets.

Context Packs solve four problems:

- Cost: limit input size.
- Privacy: control what data can leave the device or workspace.
- Quality: include the most relevant notes and sources.
- Auditability: record exactly what the model saw.

## 2. Core Principle

```text
Agent does not read the vault.
Agent receives a Context Pack.
Context Pack records what was included, why it was included, and what was omitted.
```

## 3. Context Pack Envelope

```json
{
  "context_pack_id": "ctx_01",
  "task_id": "task_01",
  "agent_run_id": "run_01",
  "created_at": "iso_datetime",
  "created_by": "context_builder_v1",
  "task": {
    "task_type": "relation_discovery | research | reflection | synthesis | writing_support | originality_check",
    "agent_id": "connection_agent",
    "trigger": "user_command | editor_sidecar | scheduled_task | system"
  },
  "privacy": {
    "mode": "normal | private_project | local_only | enterprise_restricted",
    "cloud_allowed": true,
    "redactions_applied": false
  },
  "budget": {
    "target_input_tokens": 12000,
    "estimated_input_tokens": 7600,
    "max_items": 24
  },
  "items": [],
  "omitted": [],
  "retrieval_trace": [],
  "summary": {
    "human_summary": "optional short summary for logs or UI",
    "machine_summary": "optional compact context overview"
  }
}
```

## 4. Context Item

Each item should be typed and provenance-aware.

```json
{
  "item_id": "ctx_item_01",
  "kind": "note | source_doc | artifact | project | graph_relation | user_preference | selection",
  "source_id": "note_01",
  "title": "string",
  "content": "bounded text",
  "content_format": "markdown | plain_text | json | summary",
  "origin": "human_authored | ai_generated | source_derived | user_accepted | user_rewritten | system",
  "included_reason": "current_note | user_selected | semantic_match | graph_neighbor | recent_activity | scheduled_source | project_scope | preference",
  "relevance": {
    "score": 0.87,
    "method": "text | semantic | hybrid | graph | recency | explicit"
  },
  "privacy": {
    "mode": "normal",
    "redacted": false
  },
  "token_estimate": 1200,
  "source_pointer": {
    "note_id": "note_01",
    "block_ids": ["block_01"],
    "source_doc_id": null,
    "artifact_id": null
  }
}
```

## 5. Omitted Item

Record important excluded items so debugging is possible without leaking full content.

```json
{
  "source_id": "note_99",
  "kind": "note",
  "title": "optional title if allowed",
  "reason": "privacy_blocked | token_budget | low_relevance | duplicate | unsupported_format | user_excluded",
  "score": 0.74
}
```

## 6. Retrieval Trace

The retrieval trace explains how the pack was built.

```json
{
  "step": "semantic_search",
  "tool": "search_notes",
  "query": "string",
  "filters": {
    "project_ids": ["project_01"],
    "privacy_mode": "normal"
  },
  "result_count": 20,
  "selected_count": 8
}
```

Trace content should avoid storing sensitive full text unless policy allows it.

## 7. Context Building Modes

| Mode | Use Case | Included Items |
| --- | --- | --- |
| `current_note` | Sidecar suggestions while writing | Current note, selected text, immediate graph neighbors |
| `selected_scope` | User selected notes or sources | Selected items, direct links, explicit sources |
| `research_scope` | Paper/news/RSS processing | Source chunks, related notes, project metadata |
| `reflection_scope` | Deep thinking prompts | Current note, recurring themes, tensions, prior artifacts |
| `synthesis_scope` | Multi-note synthesis | User-selected notes, source docs, accepted artifacts |
| `background_scan` | Scheduled relation discovery | Metadata, snippets, candidate pairs, privacy-filtered notes |

## 8. Privacy Rules

Privacy mode must be assigned before model routing.

Rules:

- `local_only` Context Packs cannot be sent to cloud providers.
- `private_project` Context Packs require workspace policy or user confirmation for cloud models.
- `enterprise_restricted` Context Packs can only use approved enterprise providers.
- Redacted items must be marked as redacted.
- Omitted private items should be logged as omitted without leaking content.

## 9. Token Budget Rules

The Context Builder should keep packs small enough for the selected task.

MVP defaults:

| Task Type | Target Input Budget | Notes |
| --- | --- | --- |
| Routing | 1k-2k tokens | Usually metadata and short snippets |
| Link suggestion | 4k-8k tokens | Candidate notes and snippets |
| Research card | 8k-16k tokens | Source chunks and related notes |
| Reflection | 8k-16k tokens | Current note and selected related notes |
| Synthesis | 16k-32k tokens | User-selected scope, not whole vault |

Budgets are defaults. Model Policy can adjust them by model tier and provider capability.

## 10. Redaction

Redaction should preserve usefulness while protecting sensitive content.

Possible redactions:

- Remove personal identifiers.
- Remove credentials and keys.
- Replace full note content with summary.
- Include title only.
- Include metadata only.
- Exclude item entirely.

Redaction should be recorded in the Context Pack.

## 11. MVP Context Pack Requirements

MVP must support:

- Current note.
- User-selected notes.
- Related notes from search.
- Source document chunks.
- Existing AI artifacts.
- Project metadata if available.
- Privacy mode.
- Token estimate.
- Omitted item list.
- Retrieval trace.

MVP can defer:

- Span-level provenance.
- Advanced redaction.
- Long-term personalization context.
- Complex graph traversal.
- Automatic context evaluation.

## 12. Open Questions

- Should Context Packs be persisted forever, temporarily, or summarized after the run?
- Should users be able to view the full Context Pack?
- How should the UI explain why a note was included?
- Should private note titles be visible in omitted logs?
- What is the first token estimation strategy?
- Should Context Packs store exact text or references plus hashes?

