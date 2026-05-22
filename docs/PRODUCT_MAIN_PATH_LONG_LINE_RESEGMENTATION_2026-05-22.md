# Product Main Path Long-Line Resegmentation 2026-05-22

This note reframes the former `feat/product-main-path-followup` long-lived integration branch into theme-based segments instead of file-based change groups.

The goal of this document is not to describe every commit exhaustively.
The goal is to decide:

- which parts are already mature enough to treat as a coherent segment
- which parts were mixed in opportunistically
- which parts were truly added in the final tightening pass

## Base Range

- Base before the long-line merge into `main`: `d7dab8e`
- Merge commit on `main`: `6319c8c`

Relevant long-line commits near the tail:

- `30d4ba9` feat(web): refine main-path and writing-center flow and copy
- `e7c2590` test(web): add and deduplicate Chinese copy regression coverage
- `a12f07f` fix(web): preserve writing theme context on basket updates
- `c19cca3` fix(web): preserve graph slice continuity into writing center
- `c6d4e0c` Tighten graph followup continuity into writing center

## New Theme Segments

The long line should be reframed into these four segments:

1. `main-path / writing readiness`
2. `graph followup actions`
3. `writing center continuity`
4. `copy / regression tests / Chinese copy coverage`

For immediate cleanup purposes, segment 2 and segment 3 should be temporarily grouped as one working segment:

- `graph followup actions + graph-slice-to-writing continuity`

This grouped segment is the first one to close out because the product behavior is already mostly coherent, and the last round of work was specifically about tightening its continuity boundary.

Current closure status:

- Segment 1 active closure note: [PRODUCT_MAIN_PATH_SEGMENT_1_GRAPH_FOLLOWUP_CLOSURE_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_SEGMENT_1_GRAPH_FOLLOWUP_CLOSURE_2026-05-22.md)
- Segment 1 should now be treated as the active reference slice for the first cleanup pass
- Segment 4 continuity note: [PRODUCT_MAIN_PATH_SEGMENT_4_WRITING_CENTER_CONTINUITY_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_SEGMENT_4_WRITING_CENTER_CONTINUITY_2026-05-22.md)
- Segment 5 copy and regression note: [PRODUCT_MAIN_PATH_SEGMENT_5_COPY_AND_REGRESSION_COVERAGE_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_SEGMENT_5_COPY_AND_REGRESSION_COVERAGE_2026-05-22.md)

## Segment 1

### `main-path / writing readiness`

Core focus:

- permanent-note main-path guidance
- relation readiness semantics
- project-entry readiness
- writing preflight and readiness wording

Mostly mature:

- `00c1702` Add product core main-path workflow
- `3b1e46f` stabilize note main-path relation, writing entry, and fallback state
- `6804483` isolate legacy inspector main-path helpers
- `09d282e` Improve main-path relation guidance
- `0d64f45` Add relation guidance unit coverage
- `05fae7e` Improve relation form guidance defaults
- `1259da1` Improve relation guidance prompts
- `b436c76` Add writing readiness tiers
- `c82e4bc` Unify main-path writing readiness signals
- `fa8d3b3` Align writing readiness status language
- `15a766e` Unify shared writing readiness copy
- `ebc5769` Refine writing readiness copy hierarchy
- `2137459` Tighten main-path summary copy
- `71c6c67` Fix writing readiness relation semantics
- `ea4c650` Align explicit relation readiness handling
- `d5ec210` refine main-path relation guidance wording

Mixed in / adjacent:

- distillation workflow changes that influenced readiness wording
- editor relation-form affordances that support main-path but are not themselves part of main-path segmentation

Final-round additions:

- none directly attributable to the final `graph followup continuity` pass

## Segment 2 + 3

### `graph followup actions + graph-slice-to-writing continuity`

This is the first segment to close.

Why treat them together for now:

- graph followup actions define what the next move should be
- writing continuity defines whether that move lands in the right scope
- splitting them too early would separate decision logic from entry continuity

### Mature Core

These commits form the mature graph-followup behavior spine:

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

What is mature here:

- action mapping is stable
- bridge / tension / rationale-gap followup priorities are stable
- sparse slices and isolated notes already block premature writing entry
- graph followup already carries enough context to act as a product path, not just a UI shortcut

### Mixed In Opportunistically

These changes support the graph-to-writing path, but they are not core graph followup logic:

- `30d4ba9` refine main-path and writing-center flow and copy
- `e7c2590` Chinese copy regression coverage
- `a12f07f` preserve writing theme context on basket updates
- earlier continuity helpers around theme selection and basket reset, including:
  - `958e14b` unify writing entry reset flow
  - `53838af` preserve writing theme context on basket updates
  - `eddcf6c` preserve theme entry continuity across equivalent note sets
  - `391a405` resume current project from theme list

These should not be treated as the essence of graph followup.
They belong either to writing center continuity or to copy / regression coverage.

### Truly New In The Final Round

The final tightening pass is clean and specific:

- `c19cca3` preserve graph slice continuity into writing center
- `c6d4e0c` Tighten graph followup continuity into writing center

What was actually added in that last round:

- entering writing center from graph now stays inside the current graph slice
- when the current slice has no writing-eligible notes, the path no longer silently falls back to global writing candidates
- status messaging now explicitly tells the user to go back and repair relations, boundaries, or originality checks instead of drifting into a broader unrelated writing flow

### Closure Boundary For This Segment

Treat this segment as closed when we agree on this product statement:

- graph followup decides whether the user should repair structure first or proceed to writing
- if graph followup sends the user to writing, the writing entry stays scoped to the current graph slice unless the user explicitly broadens scope

That is the cleanest boundary for the first closed segment.

## Segment 4

### `writing center continuity`

Core focus:

- writing basket continuity
- theme index continuity
- preserving project context
- preserving source index context
- reopening or resuming matching writing projects

Mostly mature:

- `b13c724` Reset writing state when switching entry context
- `f1e912f` Fix writing entry state resets
- `be524d3` Unify import writing project entry reset
- `3c71ce2` Cover import writing entry reset behavior
- `958e14b` unify writing entry reset flow
- `53838af` preserve writing theme context on basket updates
- `a12f07f` preserve writing theme context on basket updates
- `eddcf6c` preserve theme entry continuity across equivalent note sets
- `391a405` resume current project from theme list
- `5f9114d` Smooth writing center project flow
- `8920de4` Refine writing theme project entry readiness

Mixed in / adjacent:

- graph-triggered entry continuity
- copy-only changes in writing center hints

Final-round additions:

- only the slice-scoped handoff from graph belongs here, and it is better treated as part of the grouped graph segment for now

Authoritative reference:

- [PRODUCT_MAIN_PATH_SEGMENT_4_WRITING_CENTER_CONTINUITY_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_SEGMENT_4_WRITING_CENTER_CONTINUITY_2026-05-22.md)

## Segment 5

### `copy / regression tests / Chinese copy coverage`

Core focus:

- copy refinement
- Chinese copy stability
- regression tests for product path wording and followup guidance

Mostly mature:

- `e7c2590` add and deduplicate Chinese copy regression coverage
- `ad4253a` earlier equivalent copy-coverage pass
- copy-focused parts of `30d4ba9` and `c5a115b`

Mixed in / adjacent:

- tests whose true purpose is readiness semantics or writing continuity rather than copy itself

Final-round additions:

- graph followup unit coverage updates tied to slice continuity

Authoritative reference:

- [PRODUCT_MAIN_PATH_SEGMENT_5_COPY_AND_REGRESSION_COVERAGE_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_SEGMENT_5_COPY_AND_REGRESSION_COVERAGE_2026-05-22.md)

## Immediate Working Conclusion

The first segment to explicitly close is:

- `graph followup actions + graph-slice-to-writing continuity`

Within that segment:

- mature core: graph next-action decision logic
- mixed in: general writing-center continuity helpers and broad copy/test cleanup
- final-round addition: slice-scoped writing-center handoff from graph

Authoritative first-closure reference:

- [PRODUCT_MAIN_PATH_SEGMENT_1_GRAPH_FOLLOWUP_CLOSURE_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_SEGMENT_1_GRAPH_FOLLOWUP_CLOSURE_2026-05-22.md)

## Next Cleanup Order

Recommended order for future restructuring:

1. close `graph followup actions + graph-slice-to-writing continuity`
2. separate `writing center continuity` from the graph-triggered handoff specifics
3. re-isolate `main-path / writing readiness`
4. leave `copy / regression tests / Chinese copy coverage` as a cross-cutting support layer rather than a primary product slice
