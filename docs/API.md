# Yansilu API Reference

Last updated for AI configuration, local runtime discovery, scheduled task, and AI Inbox additions on 2026-05-14.

This document describes the API routes that are currently implemented and covered by automated tests. Planned product APIs are intentionally not listed as active contracts here.

## Runtime

- Default API base: `http://localhost:3000`
- Configure port with `API_PORT`
- Configure vault path with `VAULT_PATH`
- Request and response bodies are JSON unless otherwise noted
- CORS is enabled for local web prototype integration

## Common Response Fields

Most route responses include:

```json
{
  "requestId": "req_1776900000000_123",
  "timestamp": "2026-04-23T03:00:00.000Z"
}
```

Error responses use:

```json
{
  "error": {
    "code": "NOTE_NOT_FOUND",
    "message": "note not found",
    "details": {}
  },
  "requestId": "req_1776900000000_123",
  "timestamp": "2026-04-23T03:00:00.000Z"
}
```

`details` is omitted when there is no structured diagnostic payload.

## Health

### `GET /health`

Returns API health and the active vault path.

```json
{
  "ok": true,
  "service": "api",
  "requestId": "req_...",
  "vaultPath": "E:/Projects/Thinking in Notes/yansilu-vault",
  "time": "2026-04-23T03:00:00.000Z"
}
```

## Vault

### `GET /api/v1/vault`

Initializes the current vault path if needed and returns active vault metadata.

Response:

```json
{
  "item": {
    "vaultPath": "E:/vaults/current-vault",
    "defaultVaultPath": "E:/vaults/default-vault",
    "initialized": true,
    "dirs": ["notes", "imports", "exports"]
  },
  "requestId": "req_...",
  "timestamp": "2026-04-23T03:00:00.000Z"
}
```

### `POST /api/v1/vault`

Switches the active vault path for this API process and clears in-memory import records. The target vault is initialized before it becomes active.

Request:

```json
{
  "vaultPath": "E:/vaults/selected-vault"
}
```

Response status: `200`

```json
{
  "item": {
    "vaultPath": "E:/vaults/selected-vault",
    "defaultVaultPath": "E:/vaults/default-vault",
    "initialized": true,
    "dirs": ["notes", "imports", "exports"]
  },
  "requestId": "req_...",
  "timestamp": "2026-04-23T03:00:00.000Z"
}
```

## Directories

### `GET /api/v1/directories`

Query parameters:

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `includeHidden` | boolean | `false` | Include hidden directories when `true`. |

Response:

```json
{
  "items": [
    {
      "id": "dir_original_default",
      "title": "Original",
      "parentDirectoryId": null,
      "directoryType": "default",
      "isDefault": true,
      "isHidden": false,
      "fsPath": "...",
      "maxNotes": 500
    }
  ],
  "total": 1,
  "requestId": "req_...",
  "timestamp": "2026-04-23T03:00:00.000Z"
}
```

### `POST /api/v1/directories`

Request:

```json
{
  "title": "Writing",
  "parentDirectoryId": "dir_original_default",
  "directoryType": "custom",
  "fsPath": "E:/vault/notes/original/writing",
  "maxNotes": 500
}
```

Response status: `201`

```json
{
  "item": {
    "id": "dir_...",
    "title": "Writing"
  },
  "requestId": "req_...",
  "timestamp": "2026-04-23T03:00:00.000Z"
}
```

### `PATCH /api/v1/directories/:id`

Patchable fields:

- `title`
- `parentDirectoryId`
- `fsPath`
- `isHidden`
- `maxNotes`

Response status: `200`

```json
{
  "item": {
    "id": "dir_...",
    "title": "Writing"
  },
  "requestId": "req_...",
  "timestamp": "2026-04-23T03:00:00.000Z"
}
```

### `DELETE /api/v1/directories/:id`

Deletes a non-default directory.

Response status: `200`

```json
{
  "deleted": true,
  "directoryId": "dir_...",
  "requestId": "req_...",
  "timestamp": "2026-04-23T03:00:00.000Z"
}
```

### `GET /api/v1/directories/:id/notes`

Lists notes assigned to a directory.

Response:

```json
{
  "directoryId": "dir_original_default",
  "items": [
    {
      "id": "pn_...",
      "title": "Example note",
      "directoryId": "dir_original_default",
      "noteType": "permanent",
      "updatedAt": "2026-04-23T03:00:00.000Z"
    }
  ],
  "total": 1,
  "requestId": "req_...",
  "timestamp": "2026-04-23T03:00:00.000Z"
}
```

## Notes

### `POST /api/v1/notes`

Creates a Markdown note in a directory and persists it to the vault.

Request:

```json
{
  "directoryId": "dir_original_default",
  "title": "Example note",
  "body": "# Example note\n\nBody text with [[links]] and #tags.",
  "status": "draft"
}
```

Response status: `201`

```json
{
  "item": {
    "id": "pn_...",
    "title": "Example note",
    "directoryId": "dir_original_default",
    "noteType": "permanent",
    "body": "# Example note\n\nBody text with [[links]] and #tags.",
    "updatedAt": "2026-04-23T03:00:00.000Z"
  },
  "requestId": "req_...",
  "timestamp": "2026-04-23T03:00:00.000Z"
}
```

### `GET /api/v1/notes/:id`

Loads a note by ID, including Markdown body.

### `PUT /api/v1/notes/:id`

Updates a note body, title, and/or status.

Request:

```json
{
  "title": "Updated title",
  "body": "# Updated title\n\nUpdated body.",
  "status": "draft"
}
```

Response status: `200`

```json
{
  "item": {
    "id": "pn_...",
    "title": "Updated title",
    "body": "# Updated title\n\nUpdated body."
  },
  "requestId": "req_...",
  "timestamp": "2026-04-23T03:00:00.000Z"
}
```

### `POST /api/v1/notes/:id/move`

Moves a note to a different directory.

Request:

```json
{
  "directoryId": "dir_..."
}
```

### `DELETE /api/v1/notes/:id`

Deletes a note.

Response status: `200`

```json
{
  "deleted": true,
  "noteId": "pn_...",
  "requestId": "req_...",
  "timestamp": "2026-04-23T03:00:00.000Z"
}
```

### `GET /api/v1/notes/:id/relations`

Returns cataloged relations for a note, including parsed Markdown links when available.
Explicit semantic relations include server-computed `rationaleQualityScore` and `rationaleQualityLevel` fields. These are soft diagnostics for review and filtering; they do not replace the user-written rationale.

Response:

```json
{
  "item": {
    "noteId": "pn_...",
    "tags": [],
    "outgoingLinks": [],
    "backlinks": []
  },
  "requestId": "req_...",
  "timestamp": "2026-04-23T03:00:00.000Z"
}
```

### `POST /api/v1/notes/:id/relations`

Creates an explicit semantic relation from the current note to another note.

Request:

```json
{
  "toNoteId": "pn_...",
  "relationType": "supports",
  "rationale": "This note explains why the target claim holds.",
  "insightQuestion": "What would make this support fail?",
  "confidence": 1,
  "status": "confirmed"
}
```

AI-created suggestions must use `createdBy: "ai_suggestion"` and cannot be created directly as `confirmed`.
The server computes rationale quality from the rationale and insight question; clients should not send quality fields.

Response `item` includes the stored relation plus:

```json
{
  "rationaleQualityScore": 1,
  "rationaleQualityLevel": "strong"
}
```

### `PATCH /api/v1/relations/:id`

Updates a semantic relation's type, rationale, insight question, confidence, or status.

### `DELETE /api/v1/relations/:id`

Deletes an explicit semantic relation.

### `GET /api/v1/relations/review-queue`

Returns directory-scoped semantic relations whose rationale quality needs attention. By default the queue includes active `empty` and `basic` relations and excludes `dismissed` / `archived` relations.

Query parameters:

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `directoryId` | string | required | Directory whose relations should be reviewed. A relation is included when either endpoint is in scope. |
| `includeDescendants` | boolean | `false` | Include child directories in the review scope. |
| `qualityLevels` | comma string | `empty,basic` | Rationale quality levels to include. Supported values: `empty`, `basic`, `good`, `strong`. |
| `relationType` | string | `all` | Optional relation type filter. |
| `status` | string | `all` | Optional status filter. |
| `limit` | number | `20` | Clamped to `1..100`. |

Response:

```json
{
  "directoryId": "dir_...",
  "directoryTitle": "Original notes",
  "qualityLevels": ["empty", "basic"],
  "items": [
    {
      "id": "lnk_...",
      "fromNoteId": "pn_source",
      "toNoteId": "pn_target",
      "relationType": "same_topic",
      "rationaleQualityLevel": "empty",
      "reviewReason": "missing_rationale",
      "reviewPriority": 0,
      "source": { "id": "pn_source", "title": "Source" },
      "target": { "id": "pn_target", "title": "Target" }
    }
  ],
  "summary": {
    "byQualityLevel": { "empty": 1 },
    "byStatus": { "draft": 1 },
    "byRelationType": { "same_topic": 1 }
  },
  "total": 1
}
```

### `GET /api/v1/notes/search`

Searches cataloged notes by title, id, or Markdown path. Relation creation uses this endpoint so the target note does not need to be loaded in the current browser pane.

Results are ranked for relation-target lookup before `updated_at` recency is considered:

1. `exact_title`
2. `exact_id`
3. `title_prefix`
4. `id_prefix`
5. `title_contains`
6. `path_prefix`
7. `id_contains`
8. `path_contains`
9. `recent` for empty queries

Query parameters:

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `q` | string | empty | Search text. Empty query returns recent notes in scope. |
| `rootDirectoryId` | string | empty | Limit search to a directory subtree. |
| `directoryId` | string | empty | Alias for `rootDirectoryId`. |
| `excludeNoteId` | string | empty | Omit the current note from relation targets. |
| `limit` | number | `20` | Result limit, clamped to `1..100`. |

Response:

```json
{
  "rootDirectoryId": "dir_original_default",
  "query": "target",
  "ranking": {
    "method": "sqlite_catalog_note_search_v1",
    "priority": [
      "exact_title",
      "exact_id",
      "title_prefix",
      "id_prefix",
      "title_contains",
      "path_prefix",
      "id_contains",
      "path_contains",
      "recent"
    ]
  },
  "items": [
    {
      "id": "pn_target",
      "noteType": "permanent",
      "title": "Target note",
      "status": "draft",
      "markdownPath": "notes/original/target/Target note.md",
      "directoryId": "dir_original_default",
      "matchKind": "title_prefix",
      "rank": 2
    }
  ],
  "total": 1,
  "requestId": "req_...",
  "timestamp": "2026-04-23T03:00:00.000Z"
}
```

`matchKind` and `rank` are diagnostic fields for the UI and tests. They explain why a candidate appeared near the top, but they are not a semantic confidence score.

## Tags

### `GET /api/v1/tags/:tag/notes`

Searches notes by Markdown tag.

Query parameters:

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `rootDirectoryId` | string | empty | Limit search to a root directory subtree. |
| `directoryId` | string | empty | Alias for `rootDirectoryId`. |

Response:

```json
{
  "tag": "writing",
  "rootDirectoryId": "dir_original_default",
  "items": [],
  "total": 0,
  "requestId": "req_...",
  "timestamp": "2026-04-23T03:00:00.000Z"
}
```

## Graph

### `GET /api/v1/graph`

Returns a directory-scoped graph. Only `scope=directory` is supported.

Query parameters:

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `scope` | string | `directory` | MVP only accepts `directory`. |
| `directoryId` | string | required | Directory to graph. |

Response:

```json
{
  "item": {
    "directoryId": "dir_original_default",
    "nodes": [],
    "edges": [],
    "insights": {
      "supportingRelations": [],
      "conflictingRelations": [],
      "untypedRelations": [],
      "bridgeGaps": [],
      "connectedComponentCount": 0
    },
    "totalNodes": 0,
    "totalEdges": 0
  },
  "requestId": "req_...",
  "timestamp": "2026-04-23T03:00:00.000Z"
}
```

`insights` is a directory-scoped structure summary intended for the graph workspace:

- `supportingRelations`: explicit `supports` edges only
- `conflictingRelations`: explicit `contradicts` edges only
- `untypedRelations`: generic or still-underexplained links such as plain wikilinks
- `bridgeGaps`: isolated notes or disconnected clusters that likely need a bridge note or explicit connective rationale
- `connectedComponentCount`: how many disconnected graph components exist inside the current directory scope

### `GET /api/v1/graph/path`

Finds a path between notes in the note graph.

Query parameters:

| Name | Type | Description |
| --- | --- | --- |
| `fromNoteId` | string | Starting note ID. |
| `toNoteId` | string | Target note ID. |
| `directoryId` | string | Optional directory scope. |
| `maxDepth` | number | Optional traversal depth. |
| `direction` | string | Optional traversal direction. |

### `GET /api/v1/graph/conflicts`

Detects duplicate-title or graph conflict hints for a directory.

Query parameters:

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `directoryId` | string | empty | Directory scope. |
| `includeDescendants` | boolean | `true` | Include child directories unless set to `false`. |

## Demo Seeds

### `POST /api/v1/demo/knowledge-network/yijing`

Seeds the prototype vault with the bundled Yijing knowledge-network fixture used by the integration test.

This endpoint is intentionally prototype-only. It is not part of the general import pipeline, does not create an import record, and does not participate in preview / confirm / rollback. A future formal knowledge-network import should use the `imports` lifecycle below with an explicit payload schema, preview warnings, confirm selection, and rollback metadata.

The operation is idempotent. It creates or refreshes the `dir_demo_yijing_knowledge_network` directory, 16 permanent-note nodes, and 20 explicit semantic relations.

Response:

```json
{
  "item": {
    "kind": "prototype_demo_seed",
    "demoOnly": true,
    "sourceKind": "bundled_fixture",
    "importLifecycle": "none",
    "importRecordId": null,
    "fixtureId": "yijing-judgment-training",
    "directoryId": "dir_demo_yijing_knowledge_network",
    "firstNoteId": "pn_demo_yijing_YJ-05",
    "summary": {
      "notes": 16,
      "relations": 20,
      "totalNodes": 16,
      "totalEdges": 20
    }
  }
}
```

## Imports

Supported connectors:

- `markdown`
- `obsidian`
- `zotero`
- `readwise`
- `notebooklm`

Fixture examples live under `tests/fixtures/imports`:

- `zotero-basic.json`
- `readwise-basic.json`
- `notebooklm-basic.json`
- `obsidian-edge-vault/`
- `malformed/readwise-highlights-not-array.json`

### `POST /api/v1/imports/preview`

Builds candidates and writes a preview log under `vault/imports/{connector}`. It does not write notes into `vault/notes`.

External connector payloads with missing or non-array item lists currently degrade to an empty preview with `IMPORT_EMPTY_PAYLOAD` warning instead of returning `500`.

Request:

```json
{
  "connector": "markdown",
  "payload": {
    "path": "E:/imports/markdown-basic"
  },
  "options": {
    "detectWikilinks": true,
    "detectAliases": true,
    "originalityPlan": {
      "warnThreshold": 0.6,
      "blockThreshold": 0.8
    }
  }
}
```

Response status: `200`

```json
{
  "importRecordId": "imp_1776900000000_abcd1234",
  "status": "preview",
  "connector": "markdown",
  "summary": {
    "sources": 1,
    "literatureNotes": 1,
    "permanentNotes": 0,
    "warnings": 0
  },
  "samples": {
    "sourceIds": ["src_..."],
    "literatureNoteIds": ["ln_..."],
    "permanentNoteIds": []
  },
  "warnings": [],
  "originalityGuard": {
    "plan": {},
    "blockedPermanentIds": [],
    "evaluations": [],
    "warnings": []
  },
  "createdAt": "2026-04-23T03:00:00.000Z"
}
```

### `POST /api/v1/imports/:connector`

Direct connector shorthand for preview.

Example:

```json
{
  "payload": {
    "items": [
      {
        "key": "Z1",
        "title": "Zotero Item",
        "text": "Quoted text",
        "locator": "p. 9"
      }
    ]
  }
}
```

The response shape is the same as `POST /api/v1/imports/preview`.

### `GET /api/v1/imports`

Lists import records merged from memory and disk.

Query parameters:

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `limit` | number | `50` | Clamped to `0..200`. |

Response:

```json
{
  "items": [],
  "count": 0,
  "total": 0,
  "requestId": "req_...",
  "timestamp": "2026-04-23T03:00:00.000Z"
}
```

### `GET /api/v1/imports/:id`

Returns the public import record.

Import states:

| State | Description |
| --- | --- |
| `preview` | Candidates exist, but no notes were written. |
| `cancelled` | Preview was explicitly cancelled. |
| `completed` | Confirm wrote available candidates to the vault. |
| `rolled_back` | Rollback attempted to remove files created by confirm. |

Response:

```json
{
  "importRecord": {
    "importRecordId": "imp_...",
    "connector": "markdown",
    "status": "completed",
    "state": "completed",
    "summary": {
      "sources": 1,
      "literatureNotes": 1,
      "permanentNotes": 0,
      "warnings": 0
    },
    "warnings": [],
    "originalityGuard": {},
    "createdAt": "2026-04-23T03:00:00.000Z",
    "updatedAt": "2026-04-23T03:00:00.000Z",
    "payload": {},
    "options": {},
    "confirmResult": {
      "created": {
        "sources": 1,
        "literatureNotes": 1,
        "permanentNotes": 0
      },
      "skipped": {
        "conflicted": 0,
        "invalid": 0
      },
      "writtenPaths": ["notes/sources", "notes/literature"],
      "createdFiles": [],
      "finishedAt": "2026-04-23T03:00:00.000Z"
    },
    "rollbackResult": null
  },
  "requestId": "req_...",
  "timestamp": "2026-04-23T03:00:00.000Z"
}
```

### `POST /api/v1/imports/:id/confirm`

Confirms a preview and writes non-conflicting candidates to the vault.

Request:

```json
{
  "confirm": true,
  "selectedCandidateIds": ["src_001", "ln_001"],
  "overrideOriginality": false,
  "originalityPlan": {
    "warnThreshold": 0.6,
    "blockThreshold": 0.8,
    "requireCitationLocator": true,
    "allowDraftOnWarning": true,
    "blockOnBlocked": true
  }
}
```

`selectedCandidateIds` is optional. When provided, the server only writes the selected preview candidates and records that subset under `result.selection`.

Response status: `200`

```json
{
  "importRecordId": "imp_...",
  "status": "completed",
  "result": {
    "created": {
      "sources": 1,
      "literatureNotes": 1,
      "permanentNotes": 0
    },
    "skipped": {
      "conflicted": 0,
      "invalid": 0
    },
    "writtenPaths": ["notes/sources", "notes/literature"],
    "createdFiles": [
      {
        "noteId": "src_001",
        "noteType": "source",
        "path": "notes/sources/src_001.md",
        "hash": "sha1..."
      }
    ]
  },
  "originalityGuard": {
    "plan": {},
    "blockedPermanentIds": [],
    "evaluations": []
  },
  "finishedAt": "2026-04-23T03:00:00.000Z"
}
```

`result.createdFiles` exposes the exact note ids and vault-relative file paths created during confirm, which is useful for UI follow-up flows such as rollback details and writing-basket handoff.

Cancel request:

```json
{
  "confirm": false
}
```

Cancel response:

```json
{
  "importRecordId": "imp_...",
  "status": "cancelled",
  "message": "Import cancelled."
}
```

If originality guard blocks confirmation, response status is `409` with `error.code = IMPORT_ORIGINALITY_BLOCKED`.

### `POST /api/v1/imports/:id/rollback`

Rolls back a completed import by deleting only files recorded in `confirmResult.createdFiles`. Files modified after confirm are skipped.

Response status: `200`

```json
{
  "importRecordId": "imp_...",
  "status": "rolled_back",
  "result": {
    "rolledBack": 2,
    "skipped": 1,
    "rolledBackPaths": ["notes/sources/src_abc.md"],
    "skippedFiles": [
      {
        "noteId": "ln_modified",
        "noteType": "literature",
        "path": "notes/literature/ln_modified.md",
        "reason": "modified"
      }
    ]
  },
  "finishedAt": "2026-04-23T03:00:00.000Z"
}
```

## Originality

### `POST /api/v1/originality/check`

Runs originality guard without importing.

Request:

```json
{
  "originalityPlan": {
    "warnThreshold": 0.6,
    "blockThreshold": 0.8,
    "requireCitationLocator": true,
    "allowDraftOnWarning": true,
    "blockOnBlocked": true
  },
  "literature": [
    {
      "source_id": "src_001",
      "quote_text": "Quoted source text."
    }
  ],
  "permanent": [
    {
      "id": "pn_001",
      "core_claim": "A distinct claim.",
      "citations": [
        {
          "source_id": "src_001",
          "locator": "p. 12"
        }
      ]
    }
  ]
}
```

Response:

```json
{
  "originalityGuard": {
    "plan": {},
    "blockedPermanentIds": [],
    "evaluations": [],
    "warnings": []
  },
  "summary": {
    "permanentCount": 1,
    "blockedCount": 0,
    "warningCount": 0,
    "passCount": 1
  }
}
```

## Writing

### `POST /api/v1/writing-projects`

Creates a writing project from a basket of permanent notes. Literature notes and other note types are rejected.

Request:

```json
{
  "title": "Writing mainline",
  "goal": "Turn selected original notes into a draft scaffold.",
  "audience": "Knowledge workers",
  "tone": "clear",
  "basketNoteIds": ["pn_001", "pn_002"]
}
```

Response status: `201`

```json
{
  "item": {
    "id": "wp_abcd1234",
    "title": "Writing mainline",
    "goal": "Turn selected original notes into a draft scaffold.",
    "audience": "Knowledge workers",
    "tone": "clear",
    "basket_note_ids": ["pn_001", "pn_002"],
    "scaffold_id": null,
    "status": "draft",
    "basket_notes": [
      {
        "id": "pn_001",
        "title": "Writing from claims",
        "note_type": "permanent",
        "status": "active",
        "markdown_path": "notes/permanent/pn_001.md",
        "excerpt": "A draft should start from durable original claims."
      }
    ],
    "created_at": "2026-04-23T03:00:00.000Z",
    "updated_at": "2026-04-23T03:00:00.000Z"
  },
  "requestId": "req_...",
  "timestamp": "2026-04-23T03:00:00.000Z"
}
```

### `POST /api/v1/draft-scaffolds`

Generates a draft scaffold from a writing project. The response includes both structured JSON and rendered Markdown export content.

Request:

```json
{
  "writingProjectId": "wp_abcd1234"
}
```

Response status: `201`

```json
{
  "item": {
    "id": "ds_abcd1234",
    "writing_project_id": "wp_abcd1234",
    "sections": [
      {
        "heading": "Opening frame",
        "purpose": "Introduce the piece.",
        "evidence_note_ids": ["pn_001"],
        "open_questions": ["What tension or question makes this piece necessary?"],
        "order": 1
      }
    ],
    "open_questions": ["What evidence is missing?"],
    "generated_by": "writing-engine:v1",
    "markdown": "# Writing mainline\n\n## Writing Brief\n...",
    "writing_project": {
      "id": "wp_abcd1234",
      "scaffold_id": "ds_abcd1234"
    },
    "basket_notes": []
  },
  "export": {
    "json": {
      "id": "ds_abcd1234",
      "writing_project_id": "wp_abcd1234",
      "sections": [],
      "open_questions": [],
      "generated_by": "writing-engine:v1",
      "created_at": "2026-04-23T03:00:00.000Z",
      "updated_at": "2026-04-23T03:00:00.000Z"
    },
    "markdown": "# Writing mainline\n\n## Writing Brief\n..."
  },
  "requestId": "req_...",
  "timestamp": "2026-04-23T03:00:00.000Z"
}
```

## AI

### `GET /api/v1/ai/preferences`

Returns the local user's stored AI preferences for the active vault.

Response status: `200`

```json
{
  "item": {
    "userId": "local_user",
    "workspaceId": "local_workspace",
    "userMode": "Local / Private",
    "modelPack": "Privacy First",
    "budget": {
      "monthlyLimit": 10,
      "confirmationThresholdPerRun": 0.25
    },
    "privacy": {},
    "fallbackPolicy": {},
    "advancedSettings": {
      "modelRef": "local_private_gateway:manual-model",
      "secretRef": "secret_gateway"
    }
  },
  "requestId": "req_...",
  "timestamp": "2026-05-13T03:00:00.000Z"
}
```

### `POST /api/v1/ai/preferences`

Stores local AI preferences for route preview and harness execution.

Request:

```json
{
  "userMode": "Local / Private",
  "modelPack": "Privacy First",
  "monthlyBudget": 10,
  "confirmationThreshold": 0.25,
  "fallbackPolicy": {
    "allowCloudFallback": false
  },
  "privacy": {
    "defaultMode": "local_only"
  },
  "budget": {},
  "budgetState": {},
  "advancedSettings": {
    "modelRef": "local_private_gateway:manual-model",
    "secretRef": "secret_local"
  }
}
```

`snake_case` aliases are accepted for the main fields.

Response status: `200`

```json
{
  "item": {
    "userId": "local_user",
    "workspaceId": "local_workspace",
    "userMode": "Local / Private",
    "modelPack": "Privacy First",
    "advancedSettings": {
      "modelRef": "local_private_gateway:manual-model"
    }
  },
  "requestId": "req_...",
  "timestamp": "2026-05-13T03:00:00.000Z"
}
```

### `GET /api/v1/ai/route-preview`

Builds the effective model route from stored preferences and configured provider state. This route does not call a model.

Response status: `200`

```json
{
  "item": {
    "userMode": "Auto",
    "modelPack": "Starter Auto",
    "modelPackId": "starter_auto",
    "providerPreset": "platform_managed_openai",
    "provider": {
      "providerId": "platform_managed_openai",
      "displayName": "Platform-managed OpenAI",
      "adapterType": "direct_provider",
      "localExecution": false,
      "noviceVisible": true
    },
    "route": {
      "modelRef": "platform_managed_openai:standard",
      "requestedTier": "standard",
      "selectedTier": "standard",
      "localOnly": false,
      "cloudAllowed": true,
      "advancedOverride": false,
      "confirmationRequired": false
    },
    "privacy": {
      "mode": "normal",
      "localPreferred": false
    },
    "access": {
      "authMode": "platform_managed",
      "keyMode": "platform_managed",
      "requiresKey": false,
      "secretRefConfigured": false,
      "ready": true,
      "status": "ready",
      "nextAction": "none"
    },
    "health": {
      "status": "unknown",
      "checkedAt": "",
      "latencyMs": 0
    }
  },
  "requestId": "req_...",
  "timestamp": "2026-05-13T03:00:00.000Z"
}
```

### `POST /api/v1/ai/route-preview`

Builds the effective model route using request overrides merged with stored preferences. This is useful for settings screens before saving a mode or provider choice.

Request:

```json
{
  "userMode": "Auto",
  "modelPack": "China Optimized",
  "providerPreset": "china_optimized_gateway",
  "privacyMode": "normal",
  "modelTier": "standard",
  "advancedSettings": {
    "secretRef": "secret_china_gateway"
  }
}
```

Response status: `200`

```json
{
  "item": {
    "modelPack": "China Optimized",
    "provider": {
      "providerId": "china_optimized_gateway"
    },
    "access": {
      "ready": true,
      "secretRefConfigured": true
    }
  },
  "requestId": "req_...",
  "timestamp": "2026-05-13T03:00:00.000Z"
}
```

### `GET /api/v1/ai/local-runtimes/ollama/models`

Checks a local Ollama runtime and returns the installed model list. This endpoint does not run model inference; it calls Ollama's tag endpoint and normalizes the response for settings UI discovery.

Configure the Ollama base URL with `OLLAMA_BASE_URL`. Default: `http://127.0.0.1:11434`.

Response status: `200`

```json
{
  "item": {
    "runtimeId": "ollama",
    "displayName": "Ollama",
    "status": "available",
    "baseUrl": "http://127.0.0.1:11434",
    "chatEndpointUrl": "http://127.0.0.1:11434/v1/chat/completions",
    "healthEndpointUrl": "http://127.0.0.1:11434/api/tags",
    "latencyMs": 24,
    "models": [
      {
        "name": "qwen2.5:7b",
        "modifiedAt": "2026-05-14T00:00:00.000Z",
        "size": 4683087332,
        "parameterSize": "7.6B",
        "quantizationLevel": "Q4_K_M"
      }
    ],
    "recommendedModels": ["qwen2.5:7b"],
    "message": ""
  },
  "requestId": "req_...",
  "timestamp": "2026-05-14T03:00:00.000Z"
}
```

If Ollama is not reachable, the route still returns `200` with `item.status` set to `unavailable`, an empty `models` list, default recommendations, and a diagnostic `message`.

### `POST /api/v1/ai/local-runtimes/ollama/pull-model`

Downloads a local Ollama model through the local Ollama runtime. This is intended for settings flows where the user chooses local or hybrid AI and needs a recommended small model installed before local inference can run.

Request:

```json
{
  "model": "qwen2.5:7b"
}
```

Response status: `200`

```json
{
  "item": {
    "runtimeId": "ollama",
    "model": "qwen2.5:7b",
    "status": "success",
    "latencyMs": 145000,
    "pullEndpointUrl": "http://127.0.0.1:11434/api/pull",
    "runtime": {
      "runtimeId": "ollama",
      "status": "available",
      "models": [
        {
          "name": "qwen2.5:7b",
          "parameterSize": "7.6B",
          "quantizationLevel": "Q4_K_M"
        }
      ]
    }
  },
  "requestId": "req_...",
  "timestamp": "2026-05-14T03:00:00.000Z"
}
```

Invalid model names return `400` with `OLLAMA_MODEL_REQUIRED`. Pull failures return `502` with `OLLAMA_PULL_FAILED`.

### `GET /api/v1/ai/provider-configs`

Lists provider configs stored for the active vault. Raw secrets are never returned; provider configs store `secretRef` only.

Query parameters:

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `status` | string | none | Filter by provider config status, such as `enabled` or `disabled`. |
| `limit` | number | `50` | Maximum configs to return. |

Response:

```json
{
  "items": [
    {
      "id": "provider_china_optimized_gateway",
      "providerId": "china_optimized_gateway",
      "displayName": "China Optimized Gateway",
      "adapterType": "aggregated_gateway",
      "status": "enabled",
      "authMode": "workspace_managed",
      "secretRef": "secret_china_gateway",
      "endpointUrl": "https://china-gateway.example.test/v1/chat/completions",
      "headers": {},
      "capabilities": {},
      "modelMap": {},
      "runtimeModelMap": {},
      "healthCheck": {
        "enabled": false,
        "endpointUrl": "https://china-gateway.example.test/v1/chat/completions",
        "method": "GET",
        "timeoutMs": 5000,
        "expectedStatus": 200,
        "intervalSeconds": 300
      }
    }
  ],
  "total": 1,
  "requestId": "req_...",
  "timestamp": "2026-05-13T03:00:00.000Z"
}
```

### `GET /api/v1/ai/provider-configs/:providerId`

Returns one provider config by config id or provider id.

Response status: `200`

```json
{
  "item": {
    "id": "provider_local_private_gateway",
    "providerId": "local_private_gateway",
    "authMode": "local_no_key",
    "endpointUrl": "http://localhost:11434/v1/chat/completions"
  },
  "requestId": "req_...",
  "timestamp": "2026-05-13T03:00:00.000Z"
}
```

Missing configs return `404` with `AI_PROVIDER_CONFIG_NOT_FOUND`.

### `POST /api/v1/ai/provider-configs`

Creates or updates a provider config. The API validates provider id, adapter type, auth mode, endpoint rules, model maps, and secret boundaries.

Request:

```json
{
  "providerId": "minicpm_local_gateway",
  "displayName": "MiniCPM Local",
  "adapterType": "local_gateway",
  "status": "enabled",
  "authMode": "local_no_key",
  "endpointUrl": "http://localhost:11434/v1/chat/completions",
  "runtimeModelMap": {
    "minicpm_local_gateway:local_private": "minicpm"
  },
  "healthCheck": {
    "enabled": true,
    "endpointUrl": "http://localhost:11434/api/tags",
    "method": "GET",
    "timeoutMs": 1000,
    "expectedStatus": 200,
    "intervalSeconds": 30
  }
}
```

Do not send raw keys or auth headers. Fields such as `apiKey`, `api_key`, `secret`, `rawSecret`, `token`, `authorization`, or `x-api-key` are rejected by provider config validation.

Response status: `200`

```json
{
  "item": {
    "id": "provider_minicpm_local_gateway",
    "providerId": "minicpm_local_gateway",
    "authMode": "local_no_key",
    "endpointUrl": "http://localhost:11434/v1/chat/completions",
    "runtimeModelMap": {
      "minicpm_local_gateway:local_private": "minicpm"
    }
  },
  "requestId": "req_...",
  "timestamp": "2026-05-13T03:00:00.000Z"
}
```

### `POST /api/v1/ai/provider-configs/:providerId/health-check`

Runs a provider health check for an existing provider config and stores the health record. By default, the route can make the configured network request; send `networkEnabled: false` to produce a safe non-network check result.

Request:

```json
{
  "networkEnabled": true,
  "healthCheck": {
    "endpointUrl": "http://localhost:11434/api/tags",
    "method": "GET",
    "timeoutMs": 1000,
    "expectedStatus": 200
  }
}
```

Response status: `200`

```json
{
  "item": {
    "status": "succeeded",
    "record": {
      "providerId": "local_private_gateway",
      "status": "healthy",
      "latencyMs": 25,
      "message": "Provider health check succeeded."
    },
    "request": {
      "providerId": "local_private_gateway",
      "providerConfigId": "provider_local_private_gateway",
      "url": "http://localhost:11434/api/tags",
      "method": "GET",
      "expectedStatus": 200,
      "timeoutMs": 1000
    }
  },
  "requestId": "req_...",
  "timestamp": "2026-05-13T03:00:00.000Z"
}
```

### `GET /api/v1/ai/scheduled-task-templates`

Lists built-in scheduled agent task templates.

Query parameters:

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `implementationReady` | boolean | none | When present, filters templates by implementation readiness. |

Response:

```json
{
  "items": [
    {
      "templateId": "reflection_reminder",
      "name": "Reflection reminder",
      "description": "Surface one high-signal question from a selected note or theme.",
      "implementationReady": true,
      "defaultStatus": "active",
      "task": {
        "taskType": "reflection_prompt",
        "agentId": "reflection_agent"
      }
    }
  ],
  "total": 1,
  "requestId": "req_...",
  "timestamp": "2026-05-13T03:00:00.000Z"
}
```

### `GET /api/v1/ai/scheduled-tasks`

Lists local scheduled agent tasks for the active vault.

Query parameters:

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `status` | string | none | Filter by task status, such as `active` or `paused`. |
| `taskType` | string | none | Filter by task type, such as `relation_scan` or `reflection_prompt`. |
| `limit` | number | `50` | Maximum tasks to return. |

Response:

```json
{
  "items": [
    {
      "scheduledTaskId": "sched_api_reflection",
      "name": "API reflection reminder",
      "status": "active",
      "taskType": "reflection_prompt",
      "agentId": "reflection_agent",
      "schedule": {
        "type": "interval",
        "intervalMinutes": 30
      },
      "scope": {
        "noteIds": ["note_01"],
        "directoryIds": ["dir_original_default"],
        "tags": ["writing"],
        "keywords": []
      },
      "nextRunAt": "2026-05-11T08:00:00.000Z"
    }
  ],
  "total": 1,
  "requestId": "req_...",
  "timestamp": "2026-05-13T03:00:00.000Z"
}
```

### `POST /api/v1/ai/scheduled-tasks`

Creates or updates a scheduled task. When `templateId` is provided, the API expands the built-in template and then applies request overrides.

Request:

```json
{
  "templateId": "reflection_reminder",
  "scheduledTaskId": "sched_api_reflection",
  "name": "API reflection reminder",
  "status": "active",
  "schedule": {
    "type": "interval",
    "intervalMinutes": 30
  },
  "budget": {
    "maxRunsPerPeriod": 3,
    "maxEstimatedCostPerRun": 0.35,
    "maxEstimatedCostPerPeriod": 2,
    "period": "week"
  },
  "scope": {
    "noteIds": ["note_01"],
    "directoryIds": ["dir_original_default"],
    "tags": ["writing"],
    "keywords": []
  },
  "nextRunAt": "2026-05-11T08:00:00.000Z"
}
```

Response status: `201`

```json
{
  "item": {
    "scheduledTaskId": "sched_api_reflection",
    "status": "active",
    "scope": {
      "noteIds": ["note_01"],
      "directoryIds": ["dir_original_default"],
      "tags": ["writing"]
    }
  },
  "requestId": "req_...",
  "timestamp": "2026-05-13T03:00:00.000Z"
}
```

Scope rules:

- `noteIds` are explicit selected notes and take precedence over search scopes.
- `directoryIds` are stored as root directory scopes for note search.
- `tags` and `keywords` are passed through the core `search_notes` tool when no explicit `noteIds` are present.
- Scheduled runs still produce reviewable AI artifacts; scopes do not grant permission for silent note, relation, or writing-project mutation.

### `GET /api/v1/ai/scheduled-tasks/:id`

Returns one scheduled task.

Response status: `200`

```json
{
  "item": {
    "scheduledTaskId": "sched_api_reflection",
    "status": "active",
    "lastRunStatus": "succeeded",
    "lastRunAt": "2026-05-11T09:00:00.000Z"
  },
  "requestId": "req_...",
  "timestamp": "2026-05-13T03:00:00.000Z"
}
```

### `POST /api/v1/ai/scheduled-tasks/:id/status`

Updates a scheduled task status.

Request:

```json
{
  "status": "paused"
}
```

Allowed statuses are `active`, `paused`, `disabled`, and `failed`.

Response status: `200`

```json
{
  "item": {
    "scheduledTaskId": "sched_api_reflection",
    "status": "paused"
  },
  "requestId": "req_...",
  "timestamp": "2026-05-13T03:00:00.000Z"
}
```

### `DELETE /api/v1/ai/scheduled-tasks/:id`

Deletes a scheduled task.

Response status: `200`

```json
{
  "ok": true,
  "deleted": true,
  "scheduledTaskId": "sched_api_reflection",
  "requestId": "req_...",
  "timestamp": "2026-05-13T03:00:00.000Z"
}
```

### `POST /api/v1/ai/scheduled-tasks/run-due`

Manually runs due scheduled tasks for the active vault. The API path wires SQLite AI stores with core note tools, so scoped tasks can read selected or search-matched notes through harness permission boundaries.

Request:

```json
{
  "now": "2026-05-11T09:00:00.000Z",
  "limit": 10
}
```

Response status: `200`

```json
{
  "item": {
    "total": 1,
    "succeeded": 1,
    "failed": 0,
    "skipped": 0,
    "runs": [
      {
        "scheduledTaskId": "sched_api_reflection",
        "status": "succeeded",
        "result": {
          "run": {
            "status": "succeeded",
            "contextPackId": "ctx_abc123"
          },
          "contextPack": {
            "items": [
              {
                "kind": "note",
                "sourceId": "note_01"
              }
            ]
          },
          "artifacts": [
            {
              "id": "artifact_abc123",
              "type": "ReflectionPrompt",
              "status": "pending_review"
            }
          ]
        }
      }
    ]
  },
  "requestId": "req_...",
  "timestamp": "2026-05-13T03:00:00.000Z"
}
```

Scheduled runs create reviewable AI artifacts only. `relation_scan` runs include graph-neighborhood context for scoped notes, but still do not write graph edges unless the user later accepts a promotion route such as `accept-link`.

### `GET /api/v1/ai/inbox`

Lists reviewable AI artifacts from the active vault's local AI store. The default view is pending review.

Query parameters:

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `view` | string | `pending` | One of `pending`, `reviewed`, `archived`, or `all`. |
| `type` | string | none | Filter by artifact type, such as `ReflectionPrompt`, `LinkSuggestion`, `InsightCard`, `BridgeCard`, `TensionCard`, `SourceGap`, or `WritingMove`. |
| `sourceNoteId` | string | none | Filter to artifacts sourced from a note id. |
| `privacyMode` | string | none | Filter by artifact privacy mode. |
| `limit` | number | `50` | Maximum items to return, clamped by the AI inbox implementation. |

Response:

```json
{
  "items": [
    {
      "artifactId": "artifact_abc123",
      "type": "ReflectionPrompt",
      "title": "Mock insight prompt",
      "summary": "A reviewable AI artifact.",
      "status": "pending_review",
      "actionState": "needs_review",
      "primarySourceNoteId": "note_01",
      "sourceNoteIds": ["note_01"],
      "decisionCount": 0,
      "latestDecision": null
    }
  ],
  "total": 1,
  "counts": {
    "pending": 1,
    "reviewed": 0,
    "archived": 0,
    "all": 1
  },
  "views": ["pending", "reviewed", "archived", "all"],
  "requestId": "req_...",
  "timestamp": "2026-05-13T03:00:00.000Z"
}
```

### `GET /api/v1/ai/inbox/evaluation-summary`

Returns aggregate review and feedback counts for AI artifacts. By default it summarizes all inbox views; the same type/source/privacy filters from the inbox list route can narrow the result.

Query parameters:

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `view` | string | `all` | One of `pending`, `reviewed`, `archived`, or `all`. |
| `type` | string | none | Filter by artifact type. |
| `sourceNoteId` | string | none | Filter to artifacts sourced from a note id. |
| `privacyMode` | string | none | Filter by artifact privacy mode. |

Response:

```json
{
  "item": {
    "filter": {
      "view": "all",
      "type": "",
      "sourceNoteId": "note_01",
      "privacyMode": ""
    },
    "artifacts": {
      "total": 3,
      "pending": 0,
      "reviewed": 2,
      "archived": 1,
      "withDecision": 3,
      "withoutDecision": 0
    },
    "statusCounts": {
      "accepted": 1,
      "ignored": 1,
      "archived": 1
    },
    "typeCounts": {
      "ReflectionPrompt": 3
    },
    "agentRunCounts": {
      "run_abc123": 3
    },
    "decisions": {
      "total": 3,
      "artifactsWithDecision": 3,
      "latest": {
        "accepted": 1,
        "ignored": 1,
        "archived": 1
      },
      "all": {
        "accepted": 1,
        "ignored": 1,
        "archived": 1
      }
    },
    "feedback": {
      "decisionsWithFeedback": 2,
      "artifactsWithLatestFeedback": 2,
      "all": {
        "useful": 1,
        "noisy": 1,
        "wrong": 0,
        "alreadyKnown": 1,
        "privacyConcern": 0
      },
      "latest": {
        "useful": 1,
        "noisy": 1,
        "wrong": 0,
        "alreadyKnown": 1,
        "privacyConcern": 0
      }
    },
    "quality": {
      "overall": {
        "total": 3,
        "reviewed": 3,
        "accepted": 1,
        "useful": 1,
        "noisy": 1,
        "wrong": 0,
        "privacyConcern": 0,
        "reviewRate": 1,
        "acceptanceRate": 0.3333,
        "usefulRate": 0.3333,
        "noisyRate": 0.3333,
        "wrongRate": 0,
        "privacyConcernRate": 0
      },
      "byType": {
        "ReflectionPrompt": {
          "total": 3,
          "reviewed": 3,
          "accepted": 1,
          "acceptanceRate": 0.3333
        }
      },
      "byAgentRun": {
        "run_abc123": {
          "total": 3,
          "reviewed": 3,
          "accepted": 1,
          "acceptanceRate": 0.3333
        }
      },
      "byModelTier": {
        "strong_reasoning": {
          "total": 3,
          "reviewed": 3,
          "accepted": 1,
          "acceptanceRate": 0.3333
        }
      }
    }
  },
  "requestId": "req_...",
  "timestamp": "2026-05-13T03:00:00.000Z"
}
```

### `GET /api/v1/ai/inbox/:artifactId`

Returns the inbox summary plus the full stored artifact, including body, payload, model, provenance, sources, privacy, and user decision history.

Response status: `200`

```json
{
  "item": {
    "artifactId": "artifact_abc123",
    "status": "pending_review"
  },
  "artifact": {
    "id": "artifact_abc123",
    "type": "ReflectionPrompt",
    "status": "pending_review",
    "sources": {
      "noteIds": ["note_01"],
      "sourceDocIds": [],
      "artifactIds": [],
      "externalUrls": []
    },
    "provenance": {
      "contentOrigin": "ai_generated",
      "citationRequired": false,
      "humanAccepted": false,
      "humanRewritten": false
    },
    "userDecisions": []
  },
  "requestId": "req_...",
  "timestamp": "2026-05-13T03:00:00.000Z"
}
```

### `POST /api/v1/ai/inbox/:artifactId/decision`

Records a user review decision for an AI artifact. This updates artifact status and appends an explicit decision event. It does not mutate human-authored notes or create graph relations; those promotion flows require separate explicit APIs.

Request:

```json
{
  "action": "accept",
  "noteId": "note_01",
  "comment": "Useful prompt.",
  "feedback": {
    "useful": true,
    "noisy": false,
    "wrong": false,
    "alreadyKnown": false,
    "privacyConcern": false
  }
}
```

`action` accepts `accept`, `ignore`, or `archive` aliases. `decision` or `status` may also be sent directly with `accepted`, `ignored`, `archived`, or `revised`. Promotion states such as `linked_to_note` and `promoted_to_note` use dedicated promotion APIs like `accept-link` and `promote-note`.

Feedback flags can be sent inside `feedback` or as top-level fields. The API accepts both camelCase and snake_case for `alreadyKnown`/`already_known` and `privacyConcern`/`privacy_concern`, then stores normalized camelCase fields on the decision event.

Response status: `200`

```json
{
  "item": {
    "artifactId": "artifact_abc123",
    "status": "accepted",
    "latestDecision": {
      "decision": "accepted",
      "noteId": "note_01",
      "comment": "Useful prompt.",
      "feedback": {
        "useful": true,
        "noisy": false,
        "wrong": false,
        "alreadyKnown": false,
        "privacyConcern": false
      }
    }
  },
  "artifact": {
    "id": "artifact_abc123",
    "status": "accepted",
    "provenance": {
      "humanAccepted": true
    }
  },
  "latestDecision": {
    "decision": "accepted",
    "noteId": "note_01",
    "comment": "Useful prompt.",
    "feedback": {
      "useful": true,
      "noisy": false,
      "wrong": false,
      "alreadyKnown": false,
      "privacyConcern": false
    }
  },
  "requestId": "req_...",
  "timestamp": "2026-05-13T03:00:00.000Z"
}
```

### `POST /api/v1/ai/inbox/:artifactId/accept-link`

Accepts a `LinkSuggestion` artifact into a real note-to-note relation. This route requires explicit confirmation and only supports note endpoints in the artifact payload.

Request:

```json
{
  "confirm": true,
  "comment": "This bridge is useful."
}
```

Optional overrides:

| Name | Type | Description |
| --- | --- | --- |
| `fromNoteId` | string | Override the source note id from the artifact payload. |
| `toNoteId` | string | Override the target note id from the artifact payload. |
| `relationType` | string | Override the suggested relation type. |
| `rationale` | string | Override the relation rationale. |
| `confidence` | number | Override the stored relation confidence. |

Response status: `200`

```json
{
  "item": {
    "artifactId": "artifact_link_01",
    "status": "linked_to_note",
    "latestDecision": {
      "decision": "linked_to_note",
      "comment": "This bridge is useful."
    }
  },
  "artifact": {
    "id": "artifact_link_01",
    "type": "LinkSuggestion",
    "status": "linked_to_note"
  },
  "relation": {
    "id": "lnk_abcd1234",
    "fromNoteId": "note_a",
    "toNoteId": "note_b",
    "relationType": "related",
    "rationale": "The notes share a bridge concept.",
    "createdBy": "user",
    "created": true
  },
  "latestDecision": {
    "decision": "linked_to_note",
    "comment": "This bridge is useful."
  },
  "requestId": "req_...",
  "timestamp": "2026-05-13T03:00:00.000Z"
}
```

If the relation already exists, the response returns the existing relation with `created: false` and still records the artifact decision.

### `POST /api/v1/ai/inbox/:artifactId/promote-note`

Promotes a `QuestionCard` or `ReflectionPrompt` artifact into a new draft note. This route requires explicit confirmation and records a `promoted_to_note` decision. It creates a draft fleeting note by default and preserves artifact/source provenance in the note body.

Request:

```json
{
  "confirm": true,
  "comment": "Keep this as a draft question note."
}
```

Optional overrides:

| Name | Type | Description |
| --- | --- | --- |
| `directoryId` | string | Target directory id. Defaults to `dir_fleeting_default`. |
| `title` | string | Override the note title derived from the artifact. |
| `body` | string | Override the draft body derived from the artifact. |
| `status` | string | Note status. Defaults to `draft`. |

Response status: `201`

```json
{
  "item": {
    "artifactId": "artifact_question_01",
    "status": "promoted_to_note",
    "latestDecision": {
      "decision": "promoted_to_note",
      "noteId": "fn_abcd1234"
    }
  },
  "artifact": {
    "id": "artifact_question_01",
    "type": "QuestionCard",
    "status": "promoted_to_note"
  },
  "note": {
    "id": "fn_abcd1234",
    "noteType": "fleeting",
    "title": "Where does spaced repetition fail?",
    "status": "draft"
  },
  "latestDecision": {
    "decision": "promoted_to_note",
    "noteId": "fn_abcd1234"
  },
  "requestId": "req_...",
  "timestamp": "2026-05-13T03:00:00.000Z"
}
```

If the artifact has already been promoted to a note, the route returns `409 AI_ARTIFACT_ALREADY_PROMOTED` with the promoted `noteId`.

## Export

### `POST /api/v1/exports/markdown`

Copies Markdown files to the target directory, then writes an export record under `vault/exports`.

By default, this exports all Markdown files under `vault/notes` and all files under `vault/assets`. Scoped exports can use either `noteIds` or `directoryId`.

Request:

```json
{
  "targetPath": "E:/exports/yansilu-markdown",
  "noteIds": ["ln_selected_note"]
}
```

Directory-scoped request:

```json
{
  "targetPath": "E:/exports/yansilu-markdown",
  "directoryId": "dir_literature_default",
  "includeDescendants": true
}
```

`noteIds` and `directoryId` are optional and mutually exclusive. When omitted, the API exports all Markdown notes and assets. When `noteIds` or `directoryId` is provided, it exports only the matching notes and the Vault assets linked from those notes. `includeDescendants` applies only to `directoryId` and defaults to `true`.

Response status: `202`

```json
{
  "exportJobId": "exp_1776900000000_abcd1234",
  "status": "queued",
  "copied": 2,
  "copiedBreakdown": {
    "markdownFiles": 1,
    "assetFiles": 1,
    "totalFiles": 2
  },
  "scope": {
    "type": "noteIds",
    "noteIds": ["ln_selected_note"]
  }
}
```

Export record shape:

```json
{
  "exportJobId": "exp_1776900000000_abcd1234",
  "copied": 2,
  "copiedBreakdown": {
    "markdownFiles": 1,
    "assetFiles": 1,
    "totalFiles": 2
  },
  "scope": {
    "type": "noteIds",
    "noteIds": ["ln_selected_note"]
  },
  "targetPath": "E:/exports/yansilu-markdown",
  "requestId": "req_1776900000000_123",
  "exportedFiles": [
    {
      "kind": "markdown",
      "sourcePath": "notes/literature/ln_api_export.md",
      "targetPath": "literature/ln_api_export.md"
    },
    {
      "kind": "asset",
      "sourcePath": "assets/export-asset.txt",
      "targetPath": "assets/export-asset.txt"
    }
  ],
  "time": "2026-04-23T03:00:00.000Z"
}
```

## Implemented Error Codes

| Code | Typical status | Meaning |
| --- | --- | --- |
| `DIRECTORY_PAYLOAD_INVALID` | 400 | Directory create request is invalid. |
| `DIRECTORY_UPDATE_INVALID` | 400 | Directory update request is invalid. |
| `DIRECTORY_DELETE_INVALID` | 400 | Directory delete request is invalid. |
| `DIRECTORY_NOTES_INVALID` | 400 | Directory notes query failed. |
| `NOTE_PAYLOAD_INVALID` | 400 | Note create request is invalid. |
| `NOTE_NOT_FOUND` | 404 | Note does not exist. |
| `NOTE_UPDATE_INVALID` | 400 | Note update failed. |
| `NOTE_MOVE_INVALID` | 400 | Note move failed. |
| `NOTE_DELETE_INVALID` | 400 | Note delete failed. |
| `NOTE_RELATIONS_NOT_FOUND` | 404 | Note relations query failed. |
| `TAG_QUERY_INVALID` | 400 | Tag query failed. |
| `GRAPH_SCOPE_INVALID` | 400 | Graph scope is not supported. |
| `GRAPH_QUERY_INVALID` | 400 | Directory graph query failed. |
| `GRAPH_PATH_INVALID` | 400 | Graph path query failed. |
| `GRAPH_CONFLICTS_INVALID` | 400 | Graph conflict query failed. |
| `VAULT_INIT_FAILED` | 500 | Active vault could not be initialized. |
| `VAULT_PATH_REQUIRED` | 400 | Vault switch request is missing `vaultPath`. |
| `VAULT_SWITCH_FAILED` | 400 | Requested vault path could not be initialized or selected. |
| `AI_PREFERENCES_LOAD_FAILED` | 500 | AI preferences could not be loaded. |
| `AI_PREFERENCES_SAVE_FAILED` | 400 | AI preferences could not be saved. |
| `AI_ROUTE_PREVIEW_FAILED` | 400 | AI route preview could not be built. |
| `AI_PROVIDER_CONFIGS_LOAD_FAILED` | 500 | Provider config list could not be loaded. |
| `AI_PROVIDER_CONFIG_NOT_FOUND` | 404 | Provider config was not found. |
| `AI_PROVIDER_CONFIG_LOAD_FAILED` | 500 | Provider config detail could not be loaded. |
| `AI_PROVIDER_CONFIG_SAVE_FAILED` | 400 | Provider config could not be saved or failed validation. |
| `AI_PROVIDER_HEALTH_CHECK_FAILED` | 400 | Provider health check could not run. |
| `AI_SCHEDULED_TASK_TEMPLATES_LOAD_FAILED` | 500 | Scheduled task templates could not be loaded. |
| `AI_SCHEDULED_TASKS_LOAD_FAILED` | 500 | Scheduled task list could not be loaded. |
| `AI_SCHEDULED_TASK_TEMPLATE_NOT_FOUND` | 400 | Requested scheduled task template does not exist. |
| `AI_SCHEDULED_TASK_TEMPLATE_NOT_READY` | 400 | Requested scheduled task template is not implementation-ready. |
| `AI_SCHEDULED_TASK_SAVE_FAILED` | 400 | Scheduled task could not be created or updated. |
| `AI_SCHEDULED_TASK_RUN_DUE_FAILED` | 400 | Due scheduled tasks could not be executed. |
| `AI_SCHEDULED_TASK_NOT_FOUND` | 404 | Scheduled task was not found. |
| `AI_SCHEDULED_TASK_STATUS_FAILED` | 400 | Scheduled task status could not be changed. |
| `AI_SCHEDULED_TASK_LOAD_FAILED` | 500 | Scheduled task detail could not be loaded. |
| `AI_SCHEDULED_TASK_DELETE_FAILED` | 400 | Scheduled task could not be deleted. |
| `AI_ARTIFACT_NOT_FOUND` | 404 | AI artifact was not found. |
| `AI_ARTIFACT_DECISION_INVALID` | 400 | AI artifact decision is not supported. |
| `AI_INBOX_VIEW_INVALID` | 400 | AI inbox view is not supported. |
| `AI_INBOX_LOAD_FAILED` | 400 | AI inbox list query failed. |
| `AI_INBOX_ITEM_LOAD_FAILED` | 500 | AI inbox item query failed. |
| `AI_INBOX_DECISION_FAILED` | 400 | AI inbox decision request failed. |
| `AI_LINK_SUGGESTION_CONFIRMATION_REQUIRED` | 400 | LinkSuggestion acceptance was requested without `confirm: true`. |
| `AI_LINK_SUGGESTION_REQUIRED` | 400 | Link acceptance was requested for a non-LinkSuggestion artifact. |
| `AI_LINK_SUGGESTION_NOTE_ENDPOINT_REQUIRED` | 400 | LinkSuggestion acceptance only supports note-to-note endpoints. |
| `AI_LINK_SUGGESTION_ACCEPT_FAILED` | 400 | LinkSuggestion acceptance failed. |
| `IMPORT_PAYLOAD_INVALID` | 400 | Connector payload is invalid. |
| `IMPORT_RECORD_NOT_FOUND` | 404 | Import record was not found. |
| `IMPORT_STATUS_INVALID` | 400 | Import lifecycle state does not allow this operation. |
| `IMPORT_CONFIRM_REQUIRED` | 400 | Confirm request must include `confirm: true` or `confirm: false`. |
| `IMPORT_ORIGINALITY_BLOCKED` | 409 | Originality guard blocked confirm. |
| `EXPORT_SCOPE_INVALID` | 400 | Export request is missing `targetPath` or has an invalid scope. |
| `EXPORT_TARGET_INVALID` | 400 | Export target is unsafe, such as a path inside the active Vault. |
| `WRITING_PROJECT_INVALID` | 400 | Writing project request is invalid. |
| `DRAFT_SCAFFOLD_INVALID` | 400 | Draft scaffold request is invalid. |
| `NOT_FOUND` | 404 | Route not found. |
| `INTERNAL_ERROR` | 500 | Unhandled server error. |

## Not Implemented In Current API

These ideas exist in product/spec discussions but are not active API contracts in the current server:

- Type-specific note routes such as `/api/v1/notes/fleeting`
- Index card CRUD APIs
- Explicit link CRUD APIs
- Thought-distillation routes such as `/api/v1/permanent-notes/:id/distill` and `/api/v1/index-cards/:id/distill`
- Idempotency-key persistence
- Export scopes other than all Markdown, explicit `noteIds`, or directory trees

Planned thought-distillation contract is tracked in [THOUGHT_DISTILLATION_V1_CONTRACT.md](/E:/Projects/Thinking%20in%20Notes/yansilu/docs/THOUGHT_DISTILLATION_V1_CONTRACT.md).
