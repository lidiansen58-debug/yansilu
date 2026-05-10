# Core Note App Integration Contract V1

> Status: draft integration contract
> Date: 2026-05-10
> Workstream: `feat/ai-agent-layer`
> Related: `AI_TOOL_CONTRACTS_V1.md`, `AI_AGENT_LAYER_STORAGE_SCHEMA_V1.md`, `CONTEXT_PACK_SCHEMA_V1.md`

## 1. Purpose

This document defines what the AI / Agent layer needs from the core note app.

The goal is to keep the core note MVP focused on reliable note capture while giving the AI workstream a clear future integration boundary.

The AI layer should integrate through stable APIs and events, not by reaching into note internals.

## 2. Integration Principle

```text
Core note app owns notes, sources, projects, and graph.
AI layer owns artifacts, runs, contexts, scheduled tasks, and model routing.
```

Shared contract:

```text
Core app exposes read/search/events/promote operations.
AI layer consumes them through tools and writes AI-owned records.
```

## 3. Required Core Capabilities

| Capability | Needed For | Priority |
| --- | --- | --- |
| Stable note id | Artifact sources, Context Packs, run logs | P0 |
| Read note by id | Context Builder, Reflection Agent | P0 |
| Read selected text/block | Editor sidecar, focused prompts | P0 |
| Search notes | Context Builder, Connection Agent | P0 |
| Note metadata | Ranking, filtering, privacy, recency | P0 |
| Source document read | Research Agent | P1 |
| Project/topic metadata | Project digest, synthesis | P1 |
| Graph/link read | Relation suggestions | P1 |
| Artifact inbox extension point | User review of AI outputs | P1 |
| Promotion action | User turns artifact into note/link | P1 |
| Privacy metadata | Privacy Gate | P1/P0 if private mode ships |
| Note update events | Background relation scan | P2 |

## 4. Read APIs

### 4.1 `getNoteMetadata(noteId)`

Returns note metadata without full content.

```json
{
  "note_id": "note_01",
  "title": "string",
  "note_type": "original | literature | source | project",
  "tags": ["string"],
  "project_ids": ["project_01"],
  "created_at": "iso_datetime",
  "updated_at": "iso_datetime",
  "privacy_mode": "normal | private_project | local_only | enterprise_restricted"
}
```

### 4.2 `readNote(noteId, options)`

Returns bounded note content.

```json
{
  "note_id": "note_01",
  "title": "string",
  "content": "string",
  "blocks": [
    {
      "block_id": "block_01",
      "content": "string",
      "origin": "human_authored | ai_generated | source_derived | user_accepted | user_rewritten"
    }
  ],
  "privacy_mode": "normal",
  "updated_at": "iso_datetime"
}
```

Required options:

- Full note.
- Selected blocks.
- Snippet-only.
- Metadata-only.

### 4.3 `searchNotes(query, filters)`

Searches note metadata and optionally snippets.

Required filters:

- Note type.
- Project id.
- Tag id.
- Updated after.
- Privacy mode.
- Limit.

Output should include:

- Note id.
- Title.
- Snippet if allowed.
- Score.
- Matched reason.
- Privacy mode.

## 5. Source APIs

### 5.1 `readSourceDoc(sourceId, options)`

Used by Research Agent.

Returns:

- Source id.
- Title.
- Source type.
- Content or chunks.
- Citation metadata.
- Privacy mode.

P1 requirement unless research tasks are in MVP.

### 5.2 `searchSources(query, filters)`

Optional for P1.

Used for:

- Research scans.
- Linking imported sources to notes.
- Project digests.

## 6. Project and Graph APIs

### 6.1 `listProjects()`

Used by:

- Project digest.
- Context Builder.
- Scheduled task scope picker.

### 6.2 `getGraphNeighbors(entityId)`

Used by:

- Context Builder.
- Connection Agent.
- Synthesis Agent.

P1 if graph exists; otherwise AI layer can start with search-only retrieval.

## 7. Events From Core Note App

Useful future events:

```json
{
  "event_type": "note_created | note_updated | note_deleted | note_selected | source_imported | project_updated",
  "entity_id": "note_01",
  "workspace_id": "workspace_01",
  "user_id": "user_01",
  "created_at": "iso_datetime"
}
```

Event use cases:

- Build recent activity context.
- Trigger relation scan candidates.
- Refresh indexes.
- Suggest artifact review after source import.

Events are P2 unless sidecar AI needs live updates.

## 8. Writeback Boundary

The AI layer should not directly mutate human-authored notes in MVP.

Allowed write path:

```text
AI creates artifact
User reviews artifact
User accepts or revises
Core note app performs final write
AI records user decision
```

Core app should expose future user-approved actions:

- Promote artifact to new note draft.
- Insert artifact excerpt into note.
- Convert LinkSuggestion to graph edge.
- Convert ResearchCard to source note.
- Convert QuestionCard to task/question inbox.

These actions require explicit user intent.

## 9. Privacy Contract

Core app should eventually provide:

- Note privacy mode.
- Source privacy mode.
- Project privacy mode.
- Workspace cloud-AI policy.
- User override or confirmation state.

Before privacy metadata exists:

- Treat all notes as `normal` only if the product policy allows cloud AI.
- Or default to conservative cloud confirmation for user-selected content.

## 10. Minimum P0 Contract

The AI layer can start with:

- Stable note id.
- Note title and metadata.
- Read current note.
- Read user-selected notes.
- Search notes by text or existing index.
- Create AI artifact records.
- Record user decisions.

This supports:

- Reflection Agent.
- Connection Agent.
- Context Pack Builder.
- Run Log.
- Artifact review flow.

## 11. P1 Contract

P1 should add:

- Source document read.
- Source search.
- Project metadata.
- Graph neighbor read.
- Privacy metadata.
- Artifact promotion actions.

This supports:

- Research Agent.
- Scheduled research scan.
- Project digest.
- LinkSuggestion to graph edge.

## 12. Open Questions

- Does the core note app already have block ids, or only note-level ids?
- Does search support snippets, semantic search, or only text search first?
- Where should AI artifact inbox appear in the core UI?
- Should artifact promotion be handled by the core app or AI package command handlers?
- What is the first privacy metadata field core notes can expose?
- Should note update events be persisted or emitted only in-process?

