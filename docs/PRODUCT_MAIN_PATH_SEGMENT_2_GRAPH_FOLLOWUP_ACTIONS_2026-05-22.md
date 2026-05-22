# Product Main Path Segment 2 Graph Followup Actions 2026-05-22

This note splits out the `graph followup actions` portion from the earlier combined Segment 1 document.

Reference:

- [PRODUCT_MAIN_PATH_LONG_LINE_RESEGMENTATION_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_LONG_LINE_RESEGMENTATION_2026-05-22.md)
- [PRODUCT_MAIN_PATH_SEGMENT_1_GRAPH_FOLLOWUP_CLOSURE_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_SEGMENT_1_GRAPH_FOLLOWUP_CLOSURE_2026-05-22.md)
- [PRODUCT_MAIN_PATH_SEGMENT_3_GRAPH_SLICE_TO_WRITING_CONTINUITY_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_SEGMENT_3_GRAPH_SLICE_TO_WRITING_CONTINUITY_2026-05-22.md)

## Segment Name

- `graph followup actions`

## Why This Segment Exists Separately

This segment is the graph-side decision layer:

- what should the user do next from graph
- whether to repair relations before writing
- how bridge / tension / rationale-gap / isolated-note priorities are ordered
- how graph followup action context is carried into the next step

This segment is about route choice and followup semantics, not post-entry writing-state preservation.

## Segment Scope

In scope:

- graph next-action selection
- graph followup action mapping
- bridge / tension / rationale-gap / isolated-note / sparse-slice prioritization
- graph followup action context handoff

Out of scope:

- graph-slice scope preservation after routing to writing
- writing basket or project continuity after entry
- broad readiness semantics
- copy-only stabilization

## Mature Core

- `03b77f5` Drive graph followup actions
- `eb8c20b` Polish graph followup affordances
- `f23e8c5` Codify graph followup actions
- `5a394f7` Carry graph followup action context
- `31ba692` Align graph followup action mapping
- `3add766` Preserve bridge path followup context
- `f9fd242` prioritize isolated notes in graph next actions
- `698140e` keep sparse graph slices in relation-building mode
- `638b940` refine graph and theme continuity guidance
- `d7dab8e` keep graph next actions focused on rationale gaps

What is considered mature:

- the graph action vocabulary is stable
- the priority ordering for graph next-step decisions is stable enough to describe as product behavior
- graph followup acts as a real decision path rather than a passive insight panel

## Boundary Against Segment 3

Segment 2 asks:

- what should graph tell the user to do next

Segment 3 asks:

- once graph decides to send the user to writing, how should graph preserve the current slice scope

If the strongest question is route choice, it belongs here.
If the strongest question is scope preservation during graph-to-writing handoff, it belongs in Segment 3.

## Primary Evidence Files

- `apps/web/src/graph-followup.js`
- `apps/web/src/prototype-app.js`
- `tests/unit/web-graph-followup.test.mjs`

## Evidence Mapping Table

| Segment 2 concern | Primary evidence | Representative commits |
| --- | --- | --- |
| graph next-action vocabulary and mapping | `graph-followup.js`, `web-graph-followup.test.mjs` | `03b77f5`, `f23e8c5`, `31ba692` |
| priority ordering of followups | `graph-followup.js`, `web-graph-followup.test.mjs` | `3add766`, `f9fd242`, `698140e`, `d7dab8e` |
| action context carried into next step | `prototype-app.js`, `web-graph-followup.test.mjs` | `5a394f7`, `638b940` |

## Execution Checklist

- graph followup can choose relation-repair before writing
- graph followup can prioritize bridge / tension / isolated / sparse / rationale-gap followups
- graph followup can carry enough action context for the next step
- Segment 2 is not used to own post-entry writing-state continuity

## Later Extraction Checklist

Move toward Segment 3:

- `c19cca3`
- `c6d4e0c`
- any change whose strongest evidence is about preserving graph-slice scope during graph-to-writing handoff

Move toward Segment 4:

- writing continuity helpers that only happen to be triggered from graph

Move toward Segment 5:

- copy-only graph wording stabilization

## Current Closure Statement

This segment should now be treated as:

- the graph-side route-decision layer
- separate from graph-slice continuity after routing
- responsible for deciding the next graph followup move
