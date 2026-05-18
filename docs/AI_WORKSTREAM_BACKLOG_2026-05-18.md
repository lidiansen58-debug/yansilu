# AI Workstream Backlog - 2026-05-18

## P0

- Define shared schemas for `AIInboxItem`, `AISuggestion`, `AIArtifact`, and `AIAdoptionEvent`.
- Identify existing APIs, workers, and UI entry points that already overlap with AI workflows.
- Decide the source of truth for scheduled task definitions and run history.

## P1

- Build a minimal harness that can run a known AI task against deterministic fixtures.
- Add an inbox triage flow with explicit status transitions.
- Record whether a suggestion was adopted as-is, edited before adoption, or rejected.

## P2

- Add recurring task orchestration and failure surfacing.
- Add evaluation fixtures for suggestion quality and adoption quality.
- Add operator-facing visibility for task runs, retries, and stale inbox items.

## Open Questions

- Which user-visible object should be the primary adoption target: note, card, writing project, or all of the above?
- Should scheduled tasks be modeled as a worker concern first or as a product object first?
- Does the harness need replay support from day one, or can fixture-based deterministic runs come first?
