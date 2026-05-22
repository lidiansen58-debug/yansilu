# Product Main Path Segment 1 Closure 2026-05-22

This note starts the first closure pass for the former `feat/product-main-path-followup` long line.

Reference:

- [PRODUCT_MAIN_PATH_LONG_LINE_RESEGMENTATION_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_LONG_LINE_RESEGMENTATION_2026-05-22.md)

## Segment Name

- `graph followup actions + graph-slice-to-writing continuity`

## Why This Segment Closes First

This is the cleanest first segment because it already has a mature behavior spine:

- graph followup can decide whether the user should repair relations first
- graph followup can carry enough action context to make the next move explicit
- the final tightening pass only needed to close the graph-slice-to-writing boundary

This means we are not trying to invent a new slice here.
We are mostly naming and sealing an existing one.

## Segment Scope

In scope:

- graph next-action selection
- graph followup action mapping
- bridge / tension / rationale-gap / isolated-note priorities
- graph-to-writing handoff scope
- graph-slice continuity when entering writing center
- direct graph followup unit coverage

Out of scope for this first closure:

- broad writing readiness semantics
- general writing basket continuity outside graph-triggered entry
- Chinese copy coverage as a standalone track
- theme project resume behavior unless it directly affects graph-triggered handoff

## Mature Core

These commits form the mature graph-followup spine:

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

- the action vocabulary is stable
- the followup priority order is stable enough to describe as product behavior
- graph followup is no longer just an insight panel hint; it is a decision path

## Mixed In But Not Core To This Segment

These changes touch the same path but should not define the segment:

- `30d4ba9` refine main-path and writing-center flow and copy
- `e7c2590` add and deduplicate Chinese copy regression coverage
- `a12f07f` preserve writing theme context on basket updates
- `958e14b` unify writing entry reset flow
- `53838af` preserve writing theme context on basket updates
- `eddcf6c` preserve theme entry continuity across equivalent note sets
- `391a405` resume current project from theme list

How to treat them during future cleanup:

- keep them linked as supporting context
- do not let them redefine the graph segment boundary
- rehome them later under `writing center continuity` or `copy / regression coverage`

## Final-Round Tightening

These are the truly new additions from the last pass:

- `c19cca3` preserve graph slice continuity into writing center
- `c6d4e0c` Tighten graph followup continuity into writing center

What they actually add:

- writing entry launched from graph now stays inside the current graph slice
- when the current slice has no writing-eligible notes, the flow no longer silently broadens into the global writing candidate pool
- user-facing status guidance now tells the truth about the next repair step instead of pretending the scope is already writing-ready

## Current Closure Statement

This segment should now be treated as:

- a mature graph followup path
- plus a final continuity seal on the graph-slice-to-writing handoff

In other words:

- the core graph action logic was already mature before the last round
- the last round did not redefine graph followup
- the last round closed the boundary where graph followup hands off into writing center

## Files That Best Represent This Segment

Primary behavior files:

- `apps/web/src/graph-followup.js`
- `apps/web/src/prototype-app.js`

Primary direct coverage:

- `tests/unit/web-graph-followup.test.mjs`

Supporting but not defining:

- `tests/unit/web-main-path-summary.test.mjs`
- `tests/unit/web-note-browser-actions.test.mjs`

## Execution Checklist

Use this checklist when discussing whether Segment 1 is actually closed as a product slice.

`Segment identity`

- the segment name in active discussion is `graph followup actions + graph-slice-to-writing continuity`
- graph-next-action logic is treated as the core
- graph-triggered writing handoff scope is treated as the closure edge

`Behavior requirements`

- graph followup can choose relation-repair over premature writing entry
- graph followup can prioritize bridge / tension / isolated / sparse / rationale-gap followups
- graph followup can pass enough context into the next step to make the action path coherent
- entering writing center from graph remains scoped to the current graph slice
- when a graph slice has no writing-eligible notes, the flow does not silently expand into the global writing candidate pool

`Non-goals for this segment`

- do not treat general writing basket continuity as Segment 1 core behavior
- do not treat Chinese copy coverage as the definition of Segment 1
- do not drag broad main-path readiness semantics back into this segment unless they directly change graph-triggered followup behavior

`Discussion guardrails`

- if a change only affects writing project resume / theme continuity, default it to Segment 4, not Segment 1
- if a change only affects wording or regression copy snapshots, default it to Segment 5, not Segment 1
- if a change affects graph next-action choice or graph-slice handoff scope, keep it in Segment 1 unless proven otherwise

## Evidence Anchors

These are the current best evidence anchors for Segment 1.

`Core behavior evidence`

- `apps/web/src/graph-followup.js`
- `apps/web/src/prototype-app.js`

`Direct segment coverage`

- `tests/unit/web-graph-followup.test.mjs`

`Supporting cross-segment evidence`

- `tests/unit/web-main-path-summary.test.mjs`
- `tests/unit/web-note-browser-actions.test.mjs`

## Evidence Mapping Table

Use this table when we need to connect a Segment 1 claim back to concrete repository evidence.

| Segment 1 concern | Primary file evidence | Primary test evidence | Representative commit themes |
| --- | --- | --- | --- |
| graph next-action vocabulary and mapping | `apps/web/src/graph-followup.js` | `tests/unit/web-graph-followup.test.mjs` | `03b77f5`, `f23e8c5`, `31ba692` |
| bridge / tension / isolated / sparse / rationale-gap prioritization | `apps/web/src/graph-followup.js` | `tests/unit/web-graph-followup.test.mjs` | `3add766`, `f9fd242`, `698140e`, `d7dab8e` |
| graph followup action context carried into the next step | `apps/web/src/prototype-app.js` | `tests/unit/web-graph-followup.test.mjs` | `5a394f7`, `638b940` |
| graph-slice-to-writing continuity | `apps/web/src/prototype-app.js`, `apps/web/src/graph-followup.js` | `tests/unit/web-graph-followup.test.mjs` | `c19cca3`, `c6d4e0c` |
| adjacent writing continuity that should later move out of Segment 1 | `apps/web/src/prototype-app.js` | `tests/unit/web-note-browser-actions.test.mjs` | `958e14b`, `53838af`, `a12f07f`, `eddcf6c`, `391a405` |
| adjacent copy / regression coverage that should later move out of Segment 1 | mostly test and copy surfaces, not Segment 1 core files | `tests/unit/web-main-path-summary.test.mjs`, copy regression suites | `30d4ba9`, `e7c2590` |

Reading rule:

- if the strongest evidence for a change lives in `graph-followup.js` plus `web-graph-followup.test.mjs`, it is probably still Segment 1
- if the strongest evidence lives in broader writing continuity tests or copy-only coverage, it is probably adjacent support and should be challenged before keeping it in Segment 1

## Current Verification Standard

For Segment 1, stronger evidence should answer these questions directly:

- does graph next-action logic still encode the mature priority order
- does the graph-to-writing handoff still remain slice-scoped
- does unit coverage still reflect both the mature graph behavior and the final-round continuity tightening

If a future change cannot be explained against those three questions, it probably belongs to another segment.

## Closure Boundary

Treat this first closure pass as complete when we accept the following product statement:

- graph followup decides whether the user should repair structure first or proceed
- if graph followup sends the user to writing center, the handoff remains scoped to the current graph slice unless the user explicitly broadens scope

That boundary is narrow enough to be defensible and broad enough to separate this segment from the rest of the long line.

## What This Closure Does Not Yet Claim

This note does not claim that:

- all writing center continuity concerns are fully separated
- all copy and regression coverage has been rehomed cleanly
- main-path / writing readiness has been independently re-closed

Those remain later cleanup passes.

## Immediate Next Move After This Note

After this first closure note exists, the next practical step should be:

- keep using this segment name when discussing related commits and diffs
- stop treating `graph followup actions` and `writing center continuity` as one undifferentiated blob
- only pull in adjacent writing-center or copy work when it is necessary to explain the graph-slice handoff boundary

## Later Extraction Checklist

These items are currently acknowledged as adjacent, but they should be peeled away from Segment 1 in later cleanup passes.

`Move toward Segment 4: writing center continuity`

- `958e14b` unify writing entry reset flow
- `53838af` preserve writing theme context on basket updates
- `a12f07f` preserve writing theme context on basket updates
- `eddcf6c` preserve theme entry continuity across equivalent note sets
- `391a405` resume current project from theme list

When to move them:

- once the discussion is about basket persistence, theme provenance, project resume, or source-index continuity more than graph-triggered handoff scope

`Move toward Segment 5: copy / regression tests / Chinese copy coverage`

- `e7c2590` add and deduplicate Chinese copy regression coverage
- copy-dominant parts of `30d4ba9`

When to move them:

- once the discussion is mostly about wording stability, Chinese copy drift, or regression snapshot protection rather than graph action semantics

`Keep in Segment 1 unless proven otherwise`

- `c19cca3` preserve graph slice continuity into writing center
- `c6d4e0c` Tighten graph followup continuity into writing center

Why they stay:

- these two commits are the clearest expression of the Segment 1 closure edge
- moving them out would blur the distinction between graph action logic and graph-triggered writing scope
