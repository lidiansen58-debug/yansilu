# Implementation Status

## Current Status

The current implementation has a runnable backend core for the Yansilu vault, Markdown import, originality guard, connector candidate generation, import records, rollback, directories, notes, and Markdown export.

The API server now mainly coordinates request parsing, route dispatch, and response shaping. Most business behavior has been moved into packages.

## Runnable Verification

Run all tests from the project root:

```powershell
& "D:\Program Files\nodejs\npm.cmd" test
```

Current expected result:

```text
44 pass / 0 fail / 3 skipped (browser e2e requires RUN_BROWSER_E2E=1)
```

Run API syntax check:

```powershell
node --check apps\api\src\server.mjs
```

## Package Boundaries

### `packages/domain`

Owns local vault primitives and user content storage.

- Vault layout initialization.
- Frontmatter parse/serialize.
- Source, LiteratureNote, and PermanentNote Markdown persistence.
- Directory metadata.
- Directory note creation/listing.
- Note lookup and content update.
- Non-destructive note writes.

### `packages/markdown-engine`

Owns Markdown and Obsidian parsing.

- Markdown file discovery through domain helpers.
- Frontmatter preservation.
- Tags.
- Aliases.
- Wikilinks.
- Parsed wikilink targets, headings, block refs, aliases, and embed state.
- Source, LiteratureNote, and PermanentNote candidate generation.
- Malformed/unreadable input warnings.

### `packages/originality-guard`

Owns originality and trace checks for PermanentNote candidates.

- Originality policy normalization.
- Similarity scoring.
- Warning/block evaluation.
- Citation locator warnings.
- Guard output used by preview, confirm, and standalone check API.

### `packages/connectors`

Owns connector candidate generation and import bookkeeping.

- Zotero/Readwise/NotebookLM minimal candidate generation.
- Readwise pending paraphrase tag.
- Import preview/confirm/rollback JSON logs.
- Import record public view.
- Created file hashes for rollback.
- Rollback that skips user-modified files.

### `packages/export-engine`

Owns export jobs.

- Markdown export from `vault/notes`.
- Export target copying.
- Export job record writing under `vault/exports`.

## API Server Responsibilities

`apps/api/src/server.mjs` currently owns:

- HTTP server setup.
- JSON parsing.
- Request ID/error response shaping.
- Route matching.
- Import preview/confirm orchestration.
- Import record fetch/rollback orchestration.
- Directory and note route orchestration.
- Markdown export route orchestration.

It should not regain parsing, storage, originality, connector, rollback, or export business logic.

## Implemented API Surface

- `GET /health`
- `GET /api/v1/directories`
- `POST /api/v1/directories`
- `GET /api/v1/directories/:id/notes`
- `POST /api/v1/notes`
- `GET /api/v1/notes/:id`
- `PUT /api/v1/notes/:id`
- `POST /api/v1/imports/preview`
- `POST /api/v1/imports/:connector`
- `GET /api/v1/imports/:id`
- `POST /api/v1/imports/:id/confirm`
- `POST /api/v1/imports/:id/rollback`
- `POST /api/v1/originality/check`
- `POST /api/v1/exports/markdown`

## Next Recommended Work

1. Keep `docs/API.md` synchronized with the currently implemented API routes in `apps/api/src/server.mjs`.
2. Expand fixture coverage under `tests/fixtures/` for additional connector and malformed-input scenarios.
3. Enable browser e2e in controlled runs using `RUN_BROWSER_E2E=1`, and add this mode to CI when Playwright runtime is available.
4. Continue `wt-web-integration` polish for clearer import warnings, conflict details, and recovery hints.
