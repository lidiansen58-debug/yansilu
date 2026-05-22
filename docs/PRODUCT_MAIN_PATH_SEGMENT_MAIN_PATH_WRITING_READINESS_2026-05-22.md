# Product Main Path Segment Main-Path Writing Readiness 2026-05-22

This note starts the first dedicated closure pass for the `main-path / writing readiness` segment that was previously summarized only inside the long-line resegmentation note.

Reference:

- [PRODUCT_MAIN_PATH_LONG_LINE_RESEGMENTATION_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_LONG_LINE_RESEGMENTATION_2026-05-22.md)
- [PRODUCT_MAIN_PATH_SEGMENT_1_GRAPH_FOLLOWUP_CLOSURE_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_SEGMENT_1_GRAPH_FOLLOWUP_CLOSURE_2026-05-22.md)
- [PRODUCT_MAIN_PATH_SEGMENT_4_WRITING_CENTER_CONTINUITY_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_SEGMENT_4_WRITING_CENTER_CONTINUITY_2026-05-22.md)
- [PRODUCT_MAIN_PATH_SEGMENT_5_COPY_AND_REGRESSION_COVERAGE_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_SEGMENT_5_COPY_AND_REGRESSION_COVERAGE_2026-05-22.md)

## Segment Name

- `main-path / writing readiness`

## Why This Segment Exists Separately

This segment is where the product decides whether a note or note set is structurally ready to move forward:

- whether a permanent note has enough relation structure
- whether relation semantics are explicit enough
- whether a project-entry path is justified
- whether writing readiness should block, warn, or allow the next move

This is not the same as:

- Segment 1 deciding graph followup routing
- Segment 4 preserving writing-center state after entry
- Segment 5 stabilizing wording and regression coverage

## Segment Scope

In scope:

- permanent-note main-path guidance
- relation readiness semantics
- explicit relation readiness rules
- project-entry readiness
- writing preflight and readiness wording when it reflects underlying readiness semantics

Out of scope for this pass:

- graph next-action routing itself
- writing-center basket / provenance / project continuity after entry
- pure copy drift protection
- general distillation workflow unless it directly changes readiness semantics

## Mature Core

These commits form the mature main-path / writing readiness spine:

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

What is considered mature:

- readiness is no longer a vague label; it has visible thresholds and implications
- relation quality now matters, not just relation count
- main-path and project-entry readiness are treated as deliberate gating surfaces rather than incidental hints

## Mixed In But Not Core To This Segment

These changes can affect the same user flow, but should not define main-path readiness:

- `03b77f5`, `eb8c20b`, `f23e8c5`, `5a394f7`, `31ba692`, `3add766`, `f9fd242`, `698140e`, `638b940`, `d7dab8e`
- `958e14b`, `53838af`, `a12f07f`, `eddcf6c`, `391a405`, `5f9114d`, `8920de4`
- `e7c2590`, `ad4253a`

How to treat them:

- keep graph-triggered routing in Segment 1
- keep post-entry writing continuity in Segment 4
- keep wording stability and regression copy coverage in Segment 5

## Boundary Against Segment 1, 4, and 5

Segment 1 asks:

- what should the user do next from graph

Segment 4 asks:

- after entry, what writing state should be preserved

Segment 5 asks:

- how should visible guidance be worded and protected against drift

This segment asks:

- is the note or note set ready enough, semantically and structurally, to justify the next step

If a change is best explained as readiness judgment rather than routing, continuity, or presentation, it belongs here by default.

## Primary Evidence Files

Core behavior evidence:

- `apps/web/src/components-editor-pane.js`
- `apps/web/src/writing-readiness.js`

Direct supporting coverage:

- `tests/unit/web-main-path-summary.test.mjs`
- `tests/unit/web-writing-readiness.test.mjs`
- `tests/unit/web-writing-readiness-model.test.mjs`

Supporting but not defining:

- `apps/web/src/prototype-app.js`
- `tests/unit/web-graph-followup.test.mjs`
- `tests/unit/web-writing-center-flow.test.mjs`

## Evidence Mapping Table

| Main-path / writing readiness concern | Primary file evidence | Primary test evidence | Representative commit themes |
| --- | --- | --- | --- |
| permanent-note main-path guidance | `apps/web/src/components-editor-pane.js` | `tests/unit/web-main-path-summary.test.mjs` | `00c1702`, `3b1e46f`, `6804483`, `09d282e`, `d5ec210` |
| relation guidance and readiness thresholds | `apps/web/src/components-editor-pane.js`, `apps/web/src/writing-readiness.js` | `tests/unit/web-writing-readiness.test.mjs`, `tests/unit/web-writing-readiness-model.test.mjs` | `0d64f45`, `05fae7e`, `1259da1`, `b436c76`, `c82e4bc`, `ea4c650`, `71c6c67` |
| writing readiness status and hierarchy | `apps/web/src/writing-readiness.js` | `tests/unit/web-writing-readiness.test.mjs`, `tests/unit/web-main-path-summary.test.mjs` | `fa8d3b3`, `15a766e`, `ebc5769`, `2137459` |
| graph routing that should stay out of this segment core | `apps/web/src/graph-followup.js`, `apps/web/src/prototype-app.js` | `tests/unit/web-graph-followup.test.mjs` | `03b77f5`, `f23e8c5`, `31ba692`, `c19cca3`, `c6d4e0c` |
| writing-state preservation that should stay out of this segment core | `apps/web/src/prototype-app.js`, `apps/web/src/writing-center-flow.js` | `tests/unit/web-writing-center-flow.test.mjs`, `tests/unit/web-note-browser-actions.test.mjs` | `958e14b`, `53838af`, `a12f07f`, `eddcf6c`, `391a405`, `5f9114d`, `8920de4` |

Reading rule:

- if the strongest evidence is about whether something is ready enough, it is probably this segment
- if the strongest evidence is about what route to take next, it is probably Segment 1
- if the strongest evidence is about preserving state after entry, it is probably Segment 4
- if the strongest evidence is about wording stability, it is probably Segment 5

## Execution Checklist

Use this checklist when discussing whether main-path / writing readiness is actually closed as a product slice.

`Segment identity`

- readiness is treated as its own judgment layer
- this segment is not just copy, not just graph routing, and not just writing continuity

`Behavior requirements`

- main-path guidance can distinguish between isolated notes, weak relation semantics, and project-ready notes
- readiness status reflects more than raw relation count
- readiness and preflight surfaces are consistent enough to guide the user without silently changing the underlying rules

`Non-goals for this segment`

- do not use this segment to own graph followup action ordering
- do not use this segment to own writing basket continuity
- do not use this segment as a catch-all for any visible copy refinement

## Current Closure Statement

This segment should now be treated as:

- the readiness and judgment layer for the product main path
- separate from graph routing, writing continuity, and copy-protection layers
- responsible for deciding whether structure and semantics justify the next move

## What This Closure Does Not Yet Claim

This note does not claim that:

- all readiness thresholds are finalized forever
- every distillation-related edge case has been fully separated from readiness semantics
- all readiness-copy changes have been fully separated from pure copy-protection work

Those remain later cleanup passes.

## Later Extraction Checklist

These items are still adjacent to this segment, but should not remain ambiguous in future cleanup.

`Move back toward Segment 1: graph followup actions + graph-slice-to-writing continuity`

- readiness-looking changes whose strongest evidence is really graph next-action selection
- gating decisions that are actually route ordering decisions from graph

When to move them:

- once the strongest evidence is route choice rather than readiness judgment

`Move toward Segment 4: writing center continuity`

- readiness-related changes whose strongest evidence is project resume, basket preservation, or source-index continuity after entry

When to move them:

- once the strongest evidence is post-entry continuity rather than readiness judgment before entry

`Move toward Segment 5: copy / regression tests / Chinese copy coverage`

- wording-only readiness refinements
- regression coverage whose strongest evidence is copy stability rather than readiness semantics

When to move them:

- once the strongest evidence is visible wording protection rather than semantic readiness rules

`Keep in this segment unless proven otherwise`

- `00c1702`, `3b1e46f`, `6804483`, `09d282e`, `0d64f45`, `05fae7e`, `1259da1`
- `b436c76`, `c82e4bc`, `fa8d3b3`, `15a766e`, `ebc5769`, `2137459`, `71c6c67`, `ea4c650`, `d5ec210`

Why they stay:

- these changes are strongest when explained as readiness semantics and main-path judgment
- moving them into Segment 1, 4, or 5 would blur the line between deciding readiness and deciding routing, continuity, or presentation

## Immediate Next Move After This Note

After this note exists, the next practical step should be:

- use this segment as the default home for readiness-threshold and main-path-judgment discussions
- stop treating readiness as a leftover blend of graph logic, continuity logic, and copy
- challenge future changes by asking whether the strongest evidence is readiness semantics rather than routing, continuity, or copy protection
