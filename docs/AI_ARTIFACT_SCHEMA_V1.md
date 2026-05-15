# AI Artifact Schema V1

> Status: draft schema
> Date: 2026-05-09
> Workstream: `feat/ai-agent-layer`
> Related: `AI_AGENT_LAYER_REQUIREMENTS_V1.md`, `AI_TOOL_CONTRACTS_V1.md`

## 1. Purpose

AI artifacts are the default output container for the AI / Agent layer.

Agents should not silently write into human-authored notes. Instead, they create artifacts that the user can inspect, accept, revise, ignore, or archive.

This schema protects three product principles:

- Human-authored notes remain distinct from AI-generated material.
- Every AI output can be traced back to source notes, source documents, agent runs, and model usage.
- The user decides what becomes part of their own knowledge base.

## 2. Artifact Lifecycle

```text
created
  -> pending_review
  -> accepted | revised | ignored | archived
  -> promoted_to_note | linked_to_note | kept_as_artifact
```

Default state:

```text
pending_review
```

Agents can create artifacts. Users or explicit user-approved workflows decide whether an artifact is promoted into note content or graph relations.

## 3. Common Artifact Fields

All artifact types should share these fields.

```json
{
  "id": "artifact_01",
  "type": "ResearchCard",
  "title": "string",
  "summary": "string",
  "body": "string",
  "status": "pending_review",
  "origin": "ai_generated",
  "created_at": "iso_datetime",
  "updated_at": "iso_datetime",
  "created_by_agent": {
    "agent_id": "research_agent",
    "agent_version": "v1"
  },
  "run": {
    "agent_run_id": "run_01",
    "context_pack_id": "ctx_01"
  },
  "model": {
    "provider": "openai",
    "model": "model_id",
    "tier": "standard",
    "mode": "Auto"
  },
  "sources": {
    "note_ids": ["note_01"],
    "source_doc_ids": ["source_01"],
    "artifact_ids": [],
    "external_urls": []
  },
  "provenance": {
    "content_origin": "ai_generated | source_derived | mixed",
    "citation_required": true,
    "human_accepted": false,
    "human_rewritten": false
  },
  "confidence": {
    "score": 0.72,
    "label": "low | medium | high",
    "reason": "string"
  },
  "privacy": {
    "mode": "normal | private_project | local_only | enterprise_restricted",
    "cloud_model_used": true
  },
  "user_decisions": []
}
```

## 4. Status Values

| Status | Meaning |
| --- | --- |
| `pending_review` | Created by AI and awaiting user review |
| `accepted` | User accepted the artifact as useful |
| `revised` | User edited or rewrote the artifact |
| `ignored` | User dismissed it without storing value |
| `archived` | Kept for history but hidden from active inbox |
| `promoted_to_note` | User explicitly turned it into note content |
| `linked_to_note` | User linked it to one or more notes |
| `expired` | Time-sensitive artifact is no longer relevant |

## 5. User Decision Event

User decisions should be stored as explicit events.

```json
{
  "decision_id": "decision_01",
  "artifact_id": "artifact_01",
  "decision": "accepted | revised | ignored | archived | promoted_to_note | linked_to_note",
  "user_id": "user_01",
  "created_at": "iso_datetime",
  "note_id": "note_01",
  "comment": "optional string",
  "feedback": {
    "useful": false,
    "noisy": false,
    "wrong": false,
    "alreadyKnown": false,
    "privacyConcern": false
  }
}
```

This is important for:

- Originality boundaries.
- Personalization.
- Future model evaluation.
- Trust and auditability.

Feedback flags capture the user's quality signal without changing the artifact's review status. They are intentionally small and evaluable: useful, noisy, wrong, already known, and privacy concern.

## 6. Artifact Types

### 6.1 `ResearchCard`

Use for scheduled or user-triggered reading of papers, webpages, RSS items, books, PDFs, or other source material.

```json
{
  "type": "ResearchCard",
  "source_title": "string",
  "source_type": "paper | webpage | rss | pdf | book | user_file",
  "source_summary": "string",
  "key_claims": [
    {
      "claim": "string",
      "evidence": "string",
      "source_ref": "source_01#chunk_03"
    }
  ],
  "relevance_to_user": "string",
  "related_note_ids": ["note_01"],
  "suggested_questions": ["string"],
  "citation": {
    "url": "string",
    "authors": ["string"],
    "published_at": "iso_date"
  }
}
```

Default destination:

```text
AI Inbox / Research Inbox
```

### 6.2 `LinkSuggestion`

Use for candidate relationships among notes, sources, projects, and artifacts.

```json
{
  "type": "LinkSuggestion",
  "from": {
    "id": "note_01",
    "kind": "note | source | project | artifact"
  },
  "to": {
    "id": "note_02",
    "kind": "note | source | project | artifact"
  },
  "relation_type": "supports | complements | contrasts | contradicts | extends | precedes | follows | qualifies | example_of | counterexample_to | same_topic | unexpected_connection | bridges | restates | reframes | appears_in_draft",
  "rationale": "string",
  "evidence": [
    {
      "source_id": "note_01",
      "summary": "string"
    }
  ],
  "suggested_action": "create_link | merge | review_conflict | ignore"
}
```

Default behavior:

- Create a pending suggestion.
- Do not create final graph edge until user accepts.
- Current API promotion path: `POST /api/v1/ai/inbox/:artifactId/accept-link` requires explicit confirmation, creates the note relation, and records a `linked_to_note` decision.

### 6.3 `ConflictSuggestion`

Use when an agent detects a possible tension, contradiction, or unresolved assumption.

```json
{
  "type": "ConflictSuggestion",
  "claims": [
    {
      "text": "string",
      "source_id": "note_01"
    },
    {
      "text": "string",
      "source_id": "note_02"
    }
  ],
  "conflict_type": "contradiction | tension | assumption_gap | outdated_belief",
  "why_it_matters": "string",
  "suggested_reflection_question": "string"
}
```

Default destination:

```text
AI Inbox / Reflection queue
```

### 6.4 `ReflectionPrompt`

Use for thoughtful questions that help the user clarify, deepen, or revisit their own thinking.

```json
{
  "type": "ReflectionPrompt",
  "prompt": "string",
  "why_now": "string",
  "related_note_ids": ["note_01"],
  "theme": "string",
  "depth": "light | medium | deep",
  "suggested_next_action": "answer_now | save_for_later | open_related_notes"
}
```

Reflection prompts should be sparse and high-signal. They should not spam the user.

### 6.5 `SynthesisDraft`

Use for multi-note or multi-source synthesis.

```json
{
  "type": "SynthesisDraft",
  "scope": {
    "note_ids": ["note_01"],
    "source_doc_ids": ["source_01"],
    "project_id": "project_01"
  },
  "thesis": "string",
  "outline": [
    {
      "heading": "string",
      "summary": "string",
      "supporting_sources": ["note_01", "source_01"]
    }
  ],
  "open_questions": ["string"],
  "missing_evidence": ["string"]
}
```

Default behavior:

- Store as draft artifact.
- User can revise or promote parts into notes.

### 6.6 `OutlineDraft`

Use for turning selected notes into a possible article, report, talk, or project structure.

```json
{
  "type": "OutlineDraft",
  "target_format": "article | report | talk | project_plan | essay",
  "sections": [
    {
      "title": "string",
      "intent": "string",
      "source_ids": ["note_01"]
    }
  ],
  "recommended_next_step": "string"
}
```

### 6.7 `QuestionCard`

Use for extracted or generated questions worth answering later.

```json
{
  "type": "QuestionCard",
  "question": "string",
  "question_type": "clarification | research | decision | assumption | follow_up",
  "related_note_ids": ["note_01"],
  "priority": "low | medium | high",
  "suggested_owner": "user | agent | later"
}
```

### 6.8 `SourceSummary`

Use for concise source-derived summaries where a full ResearchCard is unnecessary.

```json
{
  "type": "SourceSummary",
  "source_id": "source_01",
  "summary": "string",
  "important_points": ["string"],
  "limitations": ["string"],
  "citation": {
    "url": "string"
  }
}
```

### 6.9 `ProjectDigest`

Use for periodic summaries of a project, theme, or research area.

```json
{
  "type": "ProjectDigest",
  "project_id": "project_01",
  "period": {
    "start": "iso_date",
    "end": "iso_date"
  },
  "new_sources": ["source_01"],
  "new_links": ["suggestion_01"],
  "important_changes": ["string"],
  "recommended_attention": ["string"]
}
```

### 6.10 `InsightCard`

Use for a concise possible judgment derived from bounded notes.

```json
{
  "type": "InsightCard",
  "claim": "string",
  "why_it_matters": "string",
  "source_note_ids": ["note_01"],
  "confidence_reason": "string",
  "suggested_action": "review | promote_to_note | add_source | connect_notes"
}
```

Default behavior:

- Create a pending, reviewable artifact.
- Do not merge the claim into a permanent note until the user rewrites or explicitly promotes it.

### 6.11 `BridgeCard`

Use for a possible bridge between two notes, concepts, or clusters.

```json
{
  "type": "BridgeCard",
  "bridge": "string",
  "from": {
    "id": "note_01",
    "kind": "note | concept | cluster"
  },
  "to": {
    "id": "note_02",
    "kind": "note | concept | cluster"
  },
  "rationale": "string",
  "suggested_action": "create_link | create_bridge_note | review"
}
```

### 6.12 `TensionCard`

Use for an unresolved contradiction, assumption, boundary, or productive conflict.

```json
{
  "type": "TensionCard",
  "tension": "string",
  "claim_a": {
    "text": "string",
    "source_id": "note_01"
  },
  "claim_b": {
    "text": "string",
    "source_id": "note_02"
  },
  "why_it_matters": "string",
  "suggested_action": "clarify_boundary | add_counterexample | review_sources"
}
```

### 6.13 `SourceGap`

Use for a missing evidence, citation, source, or verification requirement.

```json
{
  "type": "SourceGap",
  "gap": "string",
  "claim": "string",
  "required_source_type": "paper | book | webpage | dataset | user_note | citation",
  "related_note_ids": ["note_01"],
  "suggested_action": "find_source | mark_uncertain | revise_claim"
}
```

### 6.14 `WritingMove`

Use for a claim, counterpoint, transition, section move, or structural suggestion inside a writing project.

```json
{
  "type": "WritingMove",
  "move_type": "claim | counterpoint | transition | section | example | caveat",
  "text": "string",
  "project_id": "project_01",
  "source_note_ids": ["note_01"],
  "suggested_location": "section id or heading",
  "suggested_action": "insert_after_review | revise | find_supporting_note"
}
```

## 7. Promotion Rules

Artifacts can become part of the user's knowledge base only through explicit user action.

Allowed promotions:

- Artifact to new note draft.
- Artifact excerpt to note insertion.
- LinkSuggestion to graph edge.
- ResearchCard to source note.
- QuestionCard to task or question inbox.
- InsightCard, BridgeCard, TensionCard, SourceGap, or WritingMove to a draft note or writing scaffold after review.

Promotion should create a UserDecision event.

Promotion should preserve source provenance.

Promotion should not automatically change `human_authored` status unless the user rewrites or explicitly accepts the content under a product-defined rule.

Current implementation notes:

- `LinkSuggestion` to graph edge uses `POST /api/v1/ai/inbox/:artifactId/accept-link` and records `linked_to_note`.
- `QuestionCard` and `ReflectionPrompt` to draft note use `POST /api/v1/ai/inbox/:artifactId/promote-note` and record `promoted_to_note`.
- Generic review decisions may accept, revise, ignore, or archive artifacts, but promotion statuses require dedicated confirmation routes.

## 8. Storage Recommendations

MVP storage can use the same database as notes if it preserves separate tables or collections.

Recommended separation:

- `notes`: human-authored and user-owned note records.
- `ai_artifacts`: agent outputs and suggestions.
- `ai_artifact_sources`: note/source/artifact provenance links.
- `ai_artifact_decisions`: user decisions and promotion events.
- `agent_runs`: execution logs and model usage.

## 9. Validation Requirements

Every artifact should validate:

- Known artifact type.
- Required common fields.
- Valid status.
- At least one source or an explicit `no_source_required` reason.
- Agent run id.
- Model reference.
- Privacy mode.
- Provenance flags.

Artifacts that include source-derived claims should include source references.

## 10. MVP Scope

MVP artifact types:

- `ResearchCard`
- `LinkSuggestion`
- `ReflectionPrompt`
- `SynthesisDraft`
- `QuestionCard`
- `InsightCard`: a concise possible new judgment derived from bounded notes.
- `BridgeCard`: a possible bridge between two notes, concepts, or clusters.
- `TensionCard`: an unresolved contradiction, assumption, or productive conflict.
- `SourceGap`: a missing evidence/citation/source requirement.
- `WritingMove`: a claim, counterpoint, transition, or section move useful for a writing project.

Additional supported artifact types:

- `ConflictSuggestion`
- `OutlineDraft`
- `SourceSummary`
- `ProjectDigest`

## 11. Open Questions

- Should AI artifacts be visible in the main note list or only in an AI Inbox?
- Should accepted artifacts remain visible as artifacts after promotion?
- How should users edit artifacts before promotion?
- Can users manually create an artifact-like research card?
- Should artifact confidence be shown to users or used only internally?
- What is the exact rule for when accepted AI text becomes `user_accepted` versus `user_rewritten`?
