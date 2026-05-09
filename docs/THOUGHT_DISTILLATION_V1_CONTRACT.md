# Thought Distillation V1 Contract

## Status

This document defines the planned implementation contract for Yansilu's thought-distillation layer.

It is intentionally separate from [API.md](/E:/Projects/Thinking%20in%20Notes/yansilu/docs/API.md), because the routes described here are not active API contracts yet.

Current state:

- data schema: prepared
- SQLite migration: prepared in `006_catalog_v1_7.sql`
- API routes: not implemented
- UI enforcement: not implemented

## Product intent

The goal is to move Yansilu from a note container toward a thought distiller.

The first concrete step is to persist four high-density outputs:

1. `thesis`
2. `three_line_summary`
3. `central_question`
4. `intent`

## Persisted fields

### PermanentNote

```ts
type DistillationStatus = "missing" | "draft" | "confirmed";

interface PermanentNoteDistillationFields {
  thesis?: string;
  three_line_summary?: [string, string, string];
  distillation_status?: DistillationStatus;
}
```

Compatibility note:

- `core_claim` remains the current body-like field.
- `thesis` is additive for now, so current note creation flows do not break.

### IndexCard

```ts
interface IndexCardDistillationFields {
  thesis?: string;
  three_line_summary?: [string, string, string];
  central_question?: string;
}
```

### WritingProject

```ts
interface WritingIntentFields {
  intent?: string;
  desired_reader_takeaway?: string;
}
```

## Planned API routes

These routes are proposed contracts, not implemented routes.

### `POST /api/v1/permanent-notes/:id/distill`

Purpose:

- inspect one permanent note
- generate candidate `thesis`
- generate candidate `three_line_summary`
- return quality checks

Request:

```json
{
  "mode": "suggest",
  "includeQualityChecks": true
}
```

Response:

```json
{
  "item": {
    "note_id": "pn_001",
    "thesis": "A permanent note should capture a reusable judgment, not just store material.",
    "three_line_summary": [
      "Permanent notes should store judgments rather than excerpts.",
      "That makes them reusable in later writing and indexing.",
      "This matters because note systems fail when they optimize storage over thinking."
    ],
    "quality_checks": ["clear"],
    "rationale": "The source note already contains a stable claim, supporting reason, and product implication.",
    "needs_user_confirmation": true
  }
}
```

### `POST /api/v1/index-cards/:id/distill`

Purpose:

- compress a topic index into theme-level judgment
- expose a current `central_question`

Request:

```json
{
  "mode": "suggest",
  "includeQualityChecks": true
}
```

Response:

```json
{
  "item": {
    "index_id": "idx_topic_001",
    "thesis": "This topic is really about turning note accumulation into explicit thought compression.",
    "three_line_summary": [
      "The topic centers on thought compression rather than note storage.",
      "Its real value comes from forcing judgment, structure, and better questions.",
      "It connects directly to future writing quality and prompt quality."
    ],
    "central_question": "How can a note system force clearer compression before writing begins?",
    "quality_checks": ["clear"],
    "rationale": "The connected notes share one recurring tension: storage versus distillation.",
    "needs_user_confirmation": true
  }
}
```

## Planned save semantics

Distillation suggestions should never be auto-persisted.

Suggested lifecycle:

1. user opens note or index card
2. system requests candidate distillation
3. candidate is displayed as suggestion
4. user edits or accepts
5. confirmed fields are saved into SQLite and Markdown frontmatter

## Guardrails

1. `three_line_summary` must always contain exactly 3 items.
2. AI may suggest distillation output, but save requires user confirmation.
3. `central_question` must point to a real tension, unresolved judgment, or next-step inquiry.
4. `intent` and `desired_reader_takeaway` belong to writing preparation, not raw note capture.
