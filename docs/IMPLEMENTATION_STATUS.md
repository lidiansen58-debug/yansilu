# Implementation Status

## Current Status

The current implementation has a runnable backend core for the Yansilu vault, Markdown import, originality guard, connector candidate generation, import records, rollback, directories, notes, writing projects, draft scaffolds, and Markdown export. The web prototype is wired to the real API for directories, notes, import preview/confirm/rollback, graph refresh, Markdown export, vault switching, writing project/scaffold creation, structured operation result panels, actionable warning hints, import candidate previews, selective confirm based on checked preview candidates, focused preview filters for confirmable/blocked/warning/excluded/risky candidates, one-click confirmable/safe-candidate selection, one-click blocked/warning/risky-candidate exclusion, confirm-time summaries of excluded candidates, clickable confirm-result skip reasons that focus related candidates, candidate-level skip explanations for unselected/originality/conflict outcomes, one-click handoff of newly imported PermanentNote results into the writing basket, directly into the writing center, or straight into a new writing project, and file-manager-like directory/note operations. A unified desktop file command service now fronts browse-directory, reveal-path, open-directory, and Vault-switch command entry points for the prototype, with automated coverage for browser-fallback path picking and Tauri-backed reveal-path UI flows.

The API server now mainly coordinates request parsing, route dispatch, and response shaping. Most business behavior has been moved into packages.

Note on planning vs. implementation:

- The codebase already contains preview-generation support for several non-Phase-1 connectors.
- The product plan and release gate now distinguish between "implemented experimentally" and "required for current MVP release".
- Until the roadmap advances, the blocking import/export promise remains: Markdown import, Obsidian import, and Markdown export.

## Runnable Verification

Run all tests from the project root:

```powershell
& "D:\Program Files\nodejs\npm.cmd" test
```

Current expected result:

```text
64 pass / 0 fail / 34 skipped (browser e2e requires RUN_BROWSER_E2E=1)
```

Run API syntax check:

```powershell
node --check apps\api\src\server.mjs
```

Run the full browser e2e suite when Playwright Chromium is available:

```powershell
$env:RUN_BROWSER_E2E="1"; node --test --test-isolation=none .\tests\e2e\prototype-browser.test.mjs
```

Current local browser e2e result:

```text
34 pass / 0 fail
```

## Recent UX and shell polish

The prototype shell is no longer treated as a single catch-all canvas. It is now organized into clearer workspaces:

- Notes workspace:
  - directory tree on the left
  - multi-tab Markdown editor in the center
  - related-note inspector on the side
- Import workspace:
  - primary import flow separated from advanced/debug-oriented controls
- Graph workspace:
  - scope/summary, node list, and relation/detail sections
- Writing workspace:
  - project context, writing basket, scaffold view, and version/history areas

Recent prototype polish that is already reflected in the implementation:

- Note-first default workspace with cleaner tree, tabs, and toolbar hierarchy.
- Unified visual language across import, graph, writing, and settings workspaces.
- Desktop-style context menus and modal polish for directory and note actions.
- Dirty-state/save-state feedback, autosave draft restore, and inline `[[wikilink]]` / `#tag` suggestion flows.
- Unified empty states and bottom status feedback so unfinished or zero-result views still read like product UI instead of debug panels.

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
- Edge-case Obsidian fixture coverage for aliases, wikilinks, duplicate titles, empty folders, malformed frontmatter, and originality guard preview warnings.

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
- Fixture-backed Zotero/Readwise/NotebookLM preview coverage.
- Malformed external payload warning coverage.
- Import preview/confirm/rollback JSON logs.
- Import record public view.
- Lightweight `candidatePreview` summaries for API/UI display.
- Created file hashes for rollback.
- Rollback that skips user-modified files.

### `packages/export-engine`

Owns export jobs.

- Markdown export from `vault/notes`.
- Export target copying.
- Export job record writing under `vault/exports`.

### `packages/writing-engine`

Owns writing project and scaffold generation.

- Writing project creation.
- Writing basket validation against PermanentNote entries.
- Draft scaffold section generation.
- Paragraph-evidence mapping.
- Markdown and JSON scaffold output.

## API Server Responsibilities

`apps/api/src/server.mjs` currently owns:

- HTTP server setup.
- JSON parsing.
- Request ID/error response shaping.
- Route matching.
- Import preview/confirm orchestration.
- Import record fetch/rollback orchestration.
- Directory and note route orchestration.
- Tag, note-relation, and graph route orchestration.
- Markdown export route orchestration.
- Writing project and draft scaffold route orchestration.

It should not regain parsing, storage, originality, connector, rollback, or export business logic.

## Implemented API Surface

- `GET /health`
- `GET /api/v1/vault`
- `POST /api/v1/vault`
- `GET /api/v1/directories`
- `POST /api/v1/directories`
- `PATCH /api/v1/directories/:id`
- `DELETE /api/v1/directories/:id`
- `GET /api/v1/directories/:id/notes`
- `POST /api/v1/notes`
- `GET /api/v1/notes/:id`
- `PUT /api/v1/notes/:id`
- `POST /api/v1/notes/:id/move`
- `DELETE /api/v1/notes/:id`
- `GET /api/v1/notes/:id/relations`
- `GET /api/v1/tags/:tag/notes`
- `GET /api/v1/graph`
- `GET /api/v1/graph/path`
- `GET /api/v1/graph/conflicts`
- `POST /api/v1/imports/preview`
- `POST /api/v1/imports/:connector`
- `GET /api/v1/imports`
- `GET /api/v1/imports/:id`
- `POST /api/v1/imports/:id/confirm`
- `POST /api/v1/imports/:id/rollback`
- `POST /api/v1/originality/check`
- `POST /api/v1/exports/markdown`
- `POST /api/v1/writing-projects`
- `POST /api/v1/draft-scaffolds`

## Next Recommended Work

1. Keep `docs/API.md` synchronized with the currently implemented API routes in `apps/api/src/server.mjs`.
2. Run the desktop-shell validation sequence in [MVP_RUNTIME_CHECKLIST.md](/E:/Projects/Thinking%20in%20Notes/yansilu/docs/MVP_RUNTIME_CHECKLIST.md) on a machine with Rust + Tauri + Windows desktop prerequisites fully installed.
3. Expand fixture coverage under `tests/fixtures/` for larger real-world connector exports and multi-folder production vaults.
4. Add the full browser e2e mode to CI when Playwright runtime is available.
5. Continue product-shell polish only after the desktop file-dialog, opener, and vault-switch flows are proven on real machines.
