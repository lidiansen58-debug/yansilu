# wt-product-core Bootstrap

## Goal

This worktree owns the long-running product-core path for Yansilu:

`note main path -> distillation -> relation graph -> theme index -> writing entry`

The goal is not to accumulate unrelated UI polish. The goal is to keep the main knowledge-work path coherent so permanent notes, graph structure, theme indexing, and writing prep feel like one product workflow.

## Primary Responsibilities

1. Note main path
2. Distillation
3. Relation graph
4. Theme index
5. Writing entry

## Product Interpretation

Translate those responsibilities into product ownership:

- Note main path:
  First-run note flow, note detail, note save, note follow-up actions, and the default user path after opening the app.
- Distillation:
  `thesis`, `threeLineSummary`, `distillationStatus`, note-level clarity checks, and the user-confirmed path from raw note to reusable judgment.
- Relation graph:
  Note-to-note relation visibility, graph navigation, bridge/tension/island discovery, and reviewable relation suggestions.
- Theme index:
  Index-card creation and maintenance, `centralQuestion`, theme grouping, and the move from related notes to a meaningful topic center.
- Writing entry:
  Writing-project entry points from notes or index cards, `intent`, basket readiness, and source-grounded scaffold preparation.

## Ownership Boundary

This worktree should prefer:

- `apps/web/src/prototype-*`
- `apps/web/src/components-*`
- `packages/domain/**`
- `packages/writing-engine/**`
- note / graph / writing tests
- docs for distillation, note workflow, graph, theme index, and writing entry

This worktree should avoid owning:

- import preview / confirm / rollback changes unless the main-path handoff is directly affected
- desktop packaging and runtime bridge work
- growth, auth, billing, and marketing surfaces
- broad AI infrastructure work not directly tied to the user-facing core path

## First Active Sequence

Recommended order inside this worktree:

1. Lock the note main path
2. Tighten distillation workflow
3. Make graph findings actionable
4. Make theme index visible and useful
5. Make writing entry emerge from notes and themes

## First Slice Candidates

Use these as the first queue, in order:

1. Permanent-note detail page and default entry:
   make the default note view clearly point toward distillation, relations, and writing next steps
2. Distillation completion path:
   reduce friction around `thesis`, `threeLineSummary`, confirmation state, and why the note is still not "ready"
3. Graph-to-note loop:
   make graph navigation feed back into note understanding instead of acting like a detached visualization
4. Theme-index creation flow:
   make it clearer when several notes deserve an index card and what `centralQuestion` should capture
5. Writing entry readiness:
   show whether a note basket or theme is ready to become a writing project, and what is still missing

## Existing Docs To Anchor On

- `docs/V1_1_SPEC_DRAFT.md`
- `docs/V1_1_INFORMATION_ARCHITECTURE_AND_FLOWS.md`
- `docs/V1_1_DISTILLATION_WORKSPACE_AND_AI_SUGGESTION_RULES.md`
- `docs/V1_1_REPLANNED_TASKS_2026-05-17.md`
- `docs/PHASE_2_INDEX_CARD_AND_RELATION_MODEL.md`
- `docs/PERMANENT_NOTE_LINKING_SPEC.md`
- `docs/PHASE_4_KNOWLEDGE_WORK_CREATION_WORKFLOW.md`
- `docs/THOUGHT_DISTILLATION_V1_CONTRACT.md`

## Working Rule

Every slice merged from this worktree should improve at least one of these user-visible questions:

1. What should I do with this note now?
2. What is the judgment here?
3. How does this note connect to others?
4. Which theme is emerging?
5. Is this ready to enter writing?

