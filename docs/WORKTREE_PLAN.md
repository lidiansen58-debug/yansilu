# Worktree Development Plan

## Purpose

This plan defines how to split the next phase of Yansilu development across a spec/main workspace and four focused worktrees.

The goal is to keep the core model stable while allowing connector, originality, and UI work to proceed in parallel without drifting into conflicting assumptions.

## Recommended Shape

Use one coordination workspace plus four worktrees:

| Workspace | Role | Primary ownership |
|---|---|---|
| `spec-main` | Shared truth source | Product docs, architecture docs, schemas, API contracts, acceptance tests |
| `wt-core-vault` | Core storage foundation | Vault filesystem, note object persistence, frontmatter IO |
| `wt-import-markdown` | Markdown/Obsidian import | Markdown scan, frontmatter parse, wikilink/tag/alias preservation, preview/confirm flow |
| `wt-originality-guard` | Originality and conversion guardrails | LiteratureNote to PermanentNote constraints, low-originality detection, source trace checks |
| `wt-web-integration` | User-facing workflow | Import preview UI, confirmation UI, result display, logo/icon integration |

## Global Rules

1. `spec-main` owns docs and contracts. Feature worktrees should not silently change contracts without updating docs first.
2. `wt-core-vault` is the dependency for the other worktrees. It should land before deep connector or UI work.
3. Each worktree should keep changes inside its ownership area unless a contract update is required.
4. Imports must follow `preview -> confirm -> write` and must create an import record.
5. Writes to vault content must be non-destructive by default. Existing user-edited files are skipped unless a later explicit overwrite mode is designed.
6. Permanent notes must preserve source trace when created from literature notes.
7. NotebookLM, Zotero, and Readwise should remain connector extensions until Markdown/Obsidian import and originality guard are stable.

## Worktree 1: `wt-core-vault`

### Goal

Build the durable local storage foundation for the product.

### Scope

- Vault directory initialization.
- `notes/sources`, `notes/literature`, `notes/permanent` layout.
- Markdown file read/write helpers.
- Frontmatter parse/serialize helpers.
- Stable ID and filename strategy.
- Non-destructive write behavior.
- Minimal validation for `Source`, `LiteratureNote`, and `PermanentNote`.

### Out of Scope

- External connector-specific parsing.
- Web UI.
- Originality scoring beyond basic structural validation.

### Acceptance

- A new vault can be initialized from an empty directory.
- A source, literature note, and permanent note can be written and read back.
- Existing note files are not overwritten by default.
- Frontmatter round-trips without dropping unknown fields.

## Worktree 2: `wt-import-markdown`

### Goal

Import Markdown and Obsidian vault content into Yansilu candidates.

### Scope

- Recursively scan `.md` files.
- Parse frontmatter.
- Extract tags.
- Extract wikilinks.
- Preserve aliases when present.
- Generate `Source` and `LiteratureNote` candidates.
- Generate `PermanentNote` candidates only when explicitly marked by metadata or tags.
- Implement import preview and confirm flow against the core vault API.

### Out of Scope

- Zotero, Readwise, and NotebookLM full fidelity support.
- Originality policy decisions.
- UI implementation.

### Acceptance

- A sample Markdown folder returns a preview with counts and sample IDs.
- Confirm writes literature notes and sources into the vault.
- Permanent notes are created as candidates only.
- Wikilinks, tags, aliases, and original frontmatter are preserved.
- Empty folders and malformed frontmatter produce warnings instead of crashes.

## Worktree 3: `wt-originality-guard`

### Goal

Protect the PermanentNote layer from copied excerpts and weak transformations.

### Scope

- Low-originality detection for PermanentNote candidates.
- Source trace enforcement.
- Locator/citation trace checks where available.
- Guard response shape in preview results.
- Conversion policy from `LiteratureNote` to `PermanentNote`.

### Out of Scope

- Full plagiarism detection.
- LLM-based rewrite generation.
- Connector-specific import parsing.

### Acceptance

- A permanent note candidate identical to a literature excerpt is flagged.
- A permanent note candidate without source trace is flagged.
- Guard warnings are structured and user-facing.
- Guard failures do not silently write active permanent notes.

## Worktree 4: `wt-web-integration`

### Goal

Create the usable front-end path for import and review.

### Scope

- Import source selection UI.
- Preview summary and sample display.
- Confirm/cancel import controls.
- Conflict and warning display.
- Basic note listing after import.
- Logo and icon usage in the web prototype.

### Out of Scope

- Inventing backend rules.
- Deep graph visualization.
- Full editor experience.

### Acceptance

- A user can start a Markdown/Obsidian import from the UI.
- Preview shows source/literature/permanent counts and originality warnings.
- Confirm writes notes and shows the result.
- Cancel does not write notes.
- App branding uses the provided Yansilu icon assets.

## Suggested Order

1. Freeze this plan in `spec-main`.
2. Create or repair the Git repository root.
3. Create `wt-core-vault`.
4. Complete and merge `wt-core-vault`.
5. Create or update `wt-import-markdown`, `wt-originality-guard`, and `wt-web-integration` from the updated base.
6. Merge small vertical slices every one to two days.
7. Run the minimum end-to-end check after each merge:
   - Preview a Markdown import.
   - Confirm the import.
   - Verify files exist under `notes/`.
   - Verify existing files were not overwritten.

## Near-Term Task List

### Immediate

- Confirm where the real Git repository root should live.
- Initialize Git if this project is intended to be the repository root.
- Commit the current spec and scaffold state before creating worktrees.

### First Development Slice

- Implement vault filesystem helpers.
- Implement frontmatter parser/serializer.
- Implement note read/write helpers.
- Add a small fixture vault and focused tests.

### Second Development Slice

- Wire Markdown import preview to the vault helpers.
- Wire import confirm to non-destructive writes.
- Add originality guard warnings to preview.
- Surface preview and confirmation in the web prototype.

