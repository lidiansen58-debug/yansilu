# Yansilu API Reference

Last synced with `apps/api/src/server.mjs` on 2026-04-23.

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

Response:

```json
{
  "item": {
    "noteId": "pn_...",
    "outgoing": [],
    "incoming": []
  },
  "requestId": "req_...",
  "timestamp": "2026-04-23T03:00:00.000Z"
}
```

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

## Export

### `POST /api/v1/exports/markdown`

Copies all Markdown files under `vault/notes` and all files under `vault/assets` to the target directory, then writes an export record under `vault/exports`.

Request:

```json
{
  "targetPath": "E:/exports/yansilu-markdown"
}
```

Response status: `202`

```json
{
  "exportJobId": "exp_1776900000000_abcd1234",
  "status": "queued",
  "copied": 3,
  "copiedBreakdown": {
    "markdownFiles": 2,
    "assetFiles": 1,
    "totalFiles": 3
  }
}
```

Export record shape:

```json
{
  "exportJobId": "exp_1776900000000_abcd1234",
  "copied": 3,
  "copiedBreakdown": {
    "markdownFiles": 2,
    "assetFiles": 1,
    "totalFiles": 3
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
| `IMPORT_PAYLOAD_INVALID` | 400 | Connector payload is invalid. |
| `IMPORT_RECORD_NOT_FOUND` | 404 | Import record was not found. |
| `IMPORT_STATUS_INVALID` | 400 | Import lifecycle state does not allow this operation. |
| `IMPORT_CONFIRM_REQUIRED` | 400 | Confirm request must include `confirm: true` or `confirm: false`. |
| `IMPORT_ORIGINALITY_BLOCKED` | 409 | Originality guard blocked confirm. |
| `EXPORT_SCOPE_INVALID` | 400 | Export request is missing `targetPath`. |
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
- Export scopes other than "all Markdown under `vault/notes`"

Planned thought-distillation contract is tracked in [THOUGHT_DISTILLATION_V1_CONTRACT.md](/E:/Projects/Thinking%20in%20Notes/yansilu/docs/THOUGHT_DISTILLATION_V1_CONTRACT.md).
