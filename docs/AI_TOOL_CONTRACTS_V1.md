# AI Tool Contracts V1

> Status: draft contract
> Date: 2026-05-09
> Workstream: `feat/ai-agent-layer`
> Related: `AI_AGENT_LAYER_WORKSTREAM_FRAMEWORK_V1.md`, `AI_AGENT_LAYER_REQUIREMENTS_V1.md`

## 1. Purpose

This document defines the tool boundary between the core note app and the AI / Agent layer.

The core note product should continue focusing on reliable note capture and organization. The AI / Agent layer should consume stable tools instead of reaching into note internals.

The contract-first goal is:

```text
Core Note App exposes tools and data contracts.
AI / Agent Layer calls those tools through the Agent Harness.
```

## 2. Contract Principles

- Tools expose product capabilities, not internal implementation details.
- Tools should return bounded, typed data.
- Tools should include provenance metadata where relevant.
- Tools that read human-authored notes must be auditable.
- Tools that mutate human-authored notes should be blocked from background agents by default.
- AI-generated outputs should be written as AI artifacts unless the user explicitly accepts them.
- Tool calls should be logged in Agent Run Log.

## 3. Tool Permission Levels

| Level | Meaning | Background Agent Allowed? | Examples |
| --- | --- | --- | --- |
| `read_public` | Read non-sensitive metadata | Yes | List projects, tags, note titles |
| `read_note` | Read note content | Depends on privacy policy | Read current note, selected notes |
| `read_source` | Read imported or external source material | Yes if source policy allows | Read paper, RSS item, webpage |
| `write_ai_artifact` | Create AI-generated artifact | Yes | Research card, link suggestion |
| `write_suggestion` | Create candidate relation or draft | Yes | Link suggestion, outline draft |
| `request_confirmation` | Ask user before sensitive action | Yes | Insert draft, run expensive synthesis |
| `write_human_note` | Change user-authored note content | No by default | Append to note, rewrite paragraph |

## 4. Initial Tool List

### 4.1 `search_notes`

Find notes by query, semantic similarity, tags, links, projects, type, and recency.

Input:

```json
{
  "query": "string",
  "mode": "text | semantic | hybrid | graph | recent",
  "filters": {
    "note_types": ["original", "literature", "source", "project"],
    "project_ids": ["string"],
    "tag_ids": ["string"],
    "privacy_mode": "normal | private_project | local_only | enterprise_restricted",
    "updated_after": "iso_datetime"
  },
  "limit": 20
}
```

Output:

```json
{
  "results": [
    {
      "note_id": "string",
      "title": "string",
      "note_type": "string",
      "snippet": "string",
      "score": 0.92,
      "matched_reason": "semantic_similarity | tag | backlink | recency",
      "privacy_mode": "normal"
    }
  ]
}
```

Permissions:

- Requires `read_public` for metadata-only search.
- Requires `read_note` if snippets contain note content.

### 4.2 `read_note`

Read a note or selected blocks from a note.

Input:

```json
{
  "note_id": "string",
  "range": {
    "type": "full | blocks | selection",
    "block_ids": ["string"]
  },
  "purpose": "context_building | user_requested_answer | relation_discovery | synthesis"
}
```

Output:

```json
{
  "note_id": "string",
  "title": "string",
  "note_type": "original",
  "content": "string",
  "blocks": [
    {
      "block_id": "string",
      "content": "string",
      "origin": "human_authored | ai_generated | source_derived | user_accepted | user_rewritten"
    }
  ],
  "privacy_mode": "normal",
  "updated_at": "iso_datetime"
}
```

Permissions:

- Requires `read_note`.
- Must respect Context Pack privacy policy.

### 4.3 `read_source_doc`

Read external source material such as imported papers, webpages, RSS items, PDFs, or source cards.

Input:

```json
{
  "source_id": "string",
  "range": {
    "type": "full | abstract | chunks",
    "chunk_ids": ["string"]
  },
  "purpose": "research_card | summary | citation_check | synthesis"
}
```

Output:

```json
{
  "source_id": "string",
  "title": "string",
  "source_type": "paper | webpage | rss | pdf | book | user_file",
  "content": "string",
  "citation": {
    "url": "string",
    "authors": ["string"],
    "published_at": "iso_date"
  },
  "privacy_mode": "normal"
}
```

Permissions:

- Requires `read_source`.

### 4.4 `create_ai_artifact`

Create an AI-generated artifact that stays separate from human-authored notes.

Input:

```json
{
  "artifact_type": "ResearchCard | ReflectionPrompt | LinkSuggestion | ConflictSuggestion | SynthesisDraft | OutlineDraft | QuestionCard | SourceSummary | ProjectDigest",
  "title": "string",
  "content": "string",
  "source_note_ids": ["string"],
  "source_doc_ids": ["string"],
  "agent_run_id": "string",
  "model_ref": {
    "provider": "string",
    "model": "string",
    "tier": "standard"
  },
  "confidence": 0.7,
  "status": "pending"
}
```

Output:

```json
{
  "artifact_id": "string",
  "status": "pending",
  "created_at": "iso_datetime"
}
```

Permissions:

- Requires `write_ai_artifact`.
- Allowed for background agents if privacy policy permits.

### 4.5 `create_link_suggestion`

Create a candidate relation between notes, sources, or projects.

Input:

```json
{
  "from_id": "string",
  "to_id": "string",
  "from_type": "note | source | project | artifact",
  "to_type": "note | source | project | artifact",
  "relation_type": "supports | contradicts | extends | duplicates | cites | related | asks",
  "rationale": "string",
  "evidence": [
    {
      "source_id": "string",
      "quote_or_summary": "string"
    }
  ],
  "agent_run_id": "string"
}
```

Output:

```json
{
  "suggestion_id": "string",
  "status": "pending"
}
```

Permissions:

- Requires `write_suggestion`.
- Does not create a final user-approved link by default.

### 4.6 `request_user_confirmation`

Ask the user before a sensitive write, expensive run, cloud fallback, or promotion of AI content into human-authored notes.

Input:

```json
{
  "reason": "expensive_run | cloud_fallback | write_human_note | promote_ai_artifact | read_private_note",
  "summary": "string",
  "options": ["approve", "cancel"],
  "expires_at": "iso_datetime"
}
```

Output:

```json
{
  "decision": "approved | canceled | expired",
  "decided_at": "iso_datetime"
}
```

Permissions:

- Available to agents.
- Does not bypass workspace policy.

## 5. Mutating Human Notes

The AI / Agent layer should not directly mutate human-authored notes in MVP.

Instead:

```text
Agent creates AIArtifact or suggestion
User reviews it
User accepts, rewrites, or ignores it
Core note app performs the final note mutation
```

Future mutation tools can be added after the originality boundary is stable.

## 6. Run Log Requirements

Every tool call should record:

- Agent run id.
- Tool name.
- Input summary.
- Output summary.
- Source note ids or source doc ids read.
- Permission level.
- Privacy mode.
- Duration.
- Error or retry state.

Sensitive content should not be copied into logs unless explicitly needed for debugging and allowed by policy.

## 7. MVP Tool Boundary

The first implementation only needs:

- `search_notes`
- `read_note`
- `read_source_doc`
- `create_ai_artifact`
- `create_link_suggestion`
- `request_user_confirmation`

This is enough to support:

- Context Pack construction.
- Research cards.
- Link suggestions.
- Reflection prompts.
- Run logging.
- Originality-safe writeback through artifacts.

## 8. Open Questions

- Does the current note app have stable note ids and block ids?
- Can search return snippets without exposing full note content?
- What privacy metadata exists today, and what must be added later?
- Should AI artifacts live in the same database as notes or in a separate store?
- What is the final user action that promotes an artifact into note content?
- Should link suggestions become real graph edges only after user approval?

