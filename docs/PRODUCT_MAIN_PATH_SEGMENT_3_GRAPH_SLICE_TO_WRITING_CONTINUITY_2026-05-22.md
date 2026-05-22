# Product Main Path Segment 3 Graph Slice To Writing Continuity 2026-05-22

This note splits out the `graph-slice-to-writing continuity` portion from the earlier combined Segment 1 document.

Reference:

- [PRODUCT_MAIN_PATH_LONG_LINE_RESEGMENTATION_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_LONG_LINE_RESEGMENTATION_2026-05-22.md)
- [PRODUCT_MAIN_PATH_SEGMENT_1_GRAPH_FOLLOWUP_CLOSURE_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_SEGMENT_1_GRAPH_FOLLOWUP_CLOSURE_2026-05-22.md)
- [PRODUCT_MAIN_PATH_SEGMENT_2_GRAPH_FOLLOWUP_ACTIONS_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_SEGMENT_2_GRAPH_FOLLOWUP_ACTIONS_2026-05-22.md)
- [PRODUCT_MAIN_PATH_SEGMENT_4_WRITING_CENTER_CONTINUITY_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_SEGMENT_4_WRITING_CENTER_CONTINUITY_2026-05-22.md)

## Segment Name

- `graph-slice-to-writing continuity`

## Why This Segment Exists Separately

This segment is the boundary layer between graph routing and writing entry:

- when graph sends the user to writing, should the current graph slice remain the active scope
- when the current slice has no writing-eligible notes, should the flow broaden or stay honest about the gap
- how should status guidance reflect the real state of the slice

This segment is not about deciding the graph route itself.
It is about preserving the right scope during the graph-to-writing handoff.

## Segment Scope

In scope:

- graph-slice scope preservation when entering writing
- graph-to-writing handoff status messaging
- preventing silent fallback from slice-scoped writing entry into global writing candidates

Out of scope:

- graph next-action ordering itself
- writing-state continuity after writing has already been entered
- broad readiness semantics
- copy-only regression stabilization

## Mature Core

This segment is intentionally smaller and more recent than Segment 2.
Its cleanest anchor commits are:

- `c19cca3` preserve graph slice continuity into writing center
- `c6d4e0c` Tighten graph followup continuity into writing center

What is considered mature:

- graph-triggered writing entry should remain slice-scoped
- missing writing-eligible notes in the current slice should not silently trigger a global broadening of scope
- user-facing guidance should tell the truth about needing more relation / boundary / originality work before writing can move smoothly

## Boundary Against Segment 2

Segment 2 asks:

- what should graph tell the user to do next

Segment 3 asks:

- when graph decides to open writing, how should the current slice be preserved

If the strongest question is route choice, it belongs to Segment 2.
If the strongest question is scope preservation during handoff, it belongs here.

## Boundary Against Segment 4

Segment 3 ends at the handoff boundary.
Segment 4 begins once writing center is already entered and the question becomes:

- how should basket, provenance, project, and source-index state be preserved after entry

If the strongest question is "stay in the right graph slice," keep it here.
If the strongest question is "preserve the right writing state after entry," move it to Segment 4.

## Primary Evidence Files

- `apps/web/src/graph-followup.js`
- `apps/web/src/prototype-app.js`
- `tests/unit/web-graph-followup.test.mjs`

## Evidence Mapping Table

| Segment 3 concern | Primary evidence | Representative commits |
| --- | --- | --- |
| preserve graph-slice scope when entering writing | `prototype-app.js`, `graph-followup.js`, `web-graph-followup.test.mjs` | `c19cca3`, `c6d4e0c` |
| avoid silent fallback to global writing candidates | `graph-followup.js`, `prototype-app.js`, `web-graph-followup.test.mjs` | `c19cca3`, `c6d4e0c` |
| truthful handoff guidance when the slice is not writing-ready | `graph-followup.js`, `web-graph-followup.test.mjs` | `c6d4e0c` |

## Execution Checklist

- entering writing from graph remains scoped to the current slice
- missing writing-eligible notes in the current slice do not silently broaden scope
- handoff messaging reflects the real slice state
- Segment 3 is not used to own post-entry writing-state continuity

## Later Extraction Checklist

Move back toward Segment 2:

- changes whose strongest evidence is still graph next-action ordering rather than handoff scope

Move toward Segment 4:

- changes whose strongest evidence is preserving project / basket / provenance after writing is already open

Move toward Segment 5:

- wording-only graph-to-writing copy stabilization

## Current Closure Statement

This segment should now be treated as:

- the graph-to-writing handoff boundary layer
- separate from graph route choice
- separate from post-entry writing continuity
- responsible for preserving the current graph slice honestly when writing center is opened
