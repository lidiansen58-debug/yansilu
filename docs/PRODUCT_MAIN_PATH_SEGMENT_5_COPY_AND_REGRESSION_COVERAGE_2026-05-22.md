# Product Main Path Segment 5 Copy And Regression Coverage 2026-05-22

This note starts the first dedicated closure pass for the `copy / regression tests / Chinese copy coverage` segment that was previously mixed into the long-lived `feat/product-main-path-followup` integration line.

Reference:

- [PRODUCT_MAIN_PATH_LONG_LINE_RESEGMENTATION_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_LONG_LINE_RESEGMENTATION_2026-05-22.md)
- [PRODUCT_MAIN_PATH_SEGMENT_1_GRAPH_FOLLOWUP_CLOSURE_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_SEGMENT_1_GRAPH_FOLLOWUP_CLOSURE_2026-05-22.md)
- [PRODUCT_MAIN_PATH_SEGMENT_4_WRITING_CENTER_CONTINUITY_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_SEGMENT_4_WRITING_CENTER_CONTINUITY_2026-05-22.md)

## Segment Name

- `copy / regression tests / Chinese copy coverage`

## Why This Segment Exists Separately

The long line contains a real layer of work that is neither core graph routing nor core writing-state continuity:

- wording refinement
- Chinese copy stabilization
- regression protection for product-path messaging
- copy-sensitive tests that exist to stop drift after product behavior is already chosen

This segment exists so that wording and regression protection do not keep getting mistaken for product-slice logic.

## Segment Scope

In scope:

- copy refinement for main-path, graph followup, and writing-center user-facing messaging
- Chinese copy stabilization
- regression tests whose main job is protecting wording or visible path guidance
- coverage additions whose real purpose is copy drift detection

Out of scope for this pass:

- graph next-action semantics themselves
- writing-state continuity semantics themselves
- main-path readiness logic itself
- behavior changes that only happen to include some copy edits

## Mature Core

These commits form the mature Segment 5 spine:

- `e7c2590` test(web): add and deduplicate Chinese copy regression coverage
- `ad4253a` earlier equivalent Chinese copy coverage pass
- `30d4ba9` feat(web): refine main-path and writing-center flow and copy
- `c5a115b` earlier equivalent flow-and-copy refinement pass
- `2137459` Tighten main-path summary copy
- `ebc5769` Refine writing readiness copy hierarchy
- `e1d97ef` Tighten writing readiness summary copy
- `15a766e` Unify shared writing readiness copy

What is considered mature:

- copy is being treated as a first-class product surface rather than incidental UI polish
- Chinese copy drift is explicitly guarded by dedicated coverage
- copy-focused regression work has become a stable support layer for the main product path

## Mixed In But Not Core To This Segment

These changes often include visible wording, but they should not define Segment 5:

- `03b77f5`, `eb8c20b`, `f23e8c5`, `5a394f7`, `31ba692`, `3add766`, `f9fd242`, `698140e`, `638b940`, `d7dab8e`
- `c19cca3`, `c6d4e0c`
- `958e14b`, `53838af`, `a12f07f`, `eddcf6c`, `391a405`, `5f9114d`, `8920de4`

How to treat them:

- keep graph-triggered routing and graph-slice scope in Segment 1
- keep basket / theme / project continuity in Segment 4
- only keep a change in Segment 5 if the strongest evidence is about wording, copy stability, or regression protection

## Boundary Against Segment 1 And Segment 4

Segment 1 decides the graph followup path.
Segment 4 preserves the correct writing state after entry.
Segment 5 protects how those choices are presented and how visible guidance stays stable.

If a change is best explained as:

- "what should the user do next" -> Segment 1
- "what state should writing preserve after entry" -> Segment 4
- "how should that visible path be worded, stabilized, or regression-protected" -> Segment 5

## Primary Evidence Files

Core behavior evidence:

- `apps/web/src/prototype-app.js`
- `apps/web/src/components-editor-pane.js`
- `apps/web/src/prototype.html`

Direct supporting coverage:

- `tests/unit/web-main-path-summary.test.mjs`
- `tests/unit/web-graph-followup.test.mjs`
- copy-oriented `tests/unit/*copy*.test.mjs`
- copy-oriented `tests/e2e/*copy*.test.mjs`

Supporting but not defining:

- `tests/unit/web-note-browser-actions.test.mjs`
- `tests/unit/web-writing-center-flow.test.mjs`

## Evidence Mapping Table

| Segment 5 concern | Primary file evidence | Primary test evidence | Representative commit themes |
| --- | --- | --- | --- |
| Chinese copy regression protection | copy-focused test files under `tests/unit` and `tests/e2e` | `*copy*.test.mjs` suites | `e7c2590`, `ad4253a` |
| main-path / writing-center copy refinement | `apps/web/src/prototype-app.js`, `apps/web/src/components-editor-pane.js` | `tests/unit/web-main-path-summary.test.mjs`, copy-oriented suites | `30d4ba9`, `c5a115b`, `2137459`, `ebc5769`, `e1d97ef`, `15a766e` |
| graph followup copy that supports but does not define routing | `apps/web/src/graph-followup.js`, `apps/web/src/prototype-app.js` | `tests/unit/web-graph-followup.test.mjs` | copy-facing slices of `30d4ba9`, plus coverage added around graph copy assertions |
| behavior continuity that should stay out of Segment 5 core | `apps/web/src/prototype-app.js`, `apps/web/src/writing-center-flow.js` | `tests/unit/web-note-browser-actions.test.mjs`, `tests/unit/web-writing-center-flow.test.mjs` | `958e14b`, `53838af`, `a12f07f`, `eddcf6c`, `391a405`, `5f9114d`, `8920de4` |

Reading rule:

- if the strongest evidence is a wording assertion, copy regression suite, or visible guidance snapshot, it is probably Segment 5
- if the strongest evidence is a state transition or route decision, it probably belongs to Segment 1 or Segment 4 instead

## Execution Checklist

Use this checklist when discussing whether Segment 5 is actually closed as a product slice.

`Segment identity`

- Segment 5 is not "misc tests"
- Segment 5 is the layer where copy and visible guidance are stabilized and protected against drift

`Behavior requirements`

- important user-facing path guidance has deliberate wording rather than incidental copy
- Chinese copy regressions have explicit coverage
- regression tests protect wording where wording is the user-visible product contract

`Non-goals for this segment`

- do not use Segment 5 to decide graph routing
- do not use Segment 5 to own writing-state preservation logic
- do not dump unrelated tests here just because they are easy to classify as coverage

## Current Closure Statement

This segment should now be treated as:

- the copy and regression-protection layer for the product main path
- separate from behavior routing and behavior continuity
- responsible for stabilizing visible guidance rather than defining the underlying state machine

## What This Closure Does Not Yet Claim

This note does not claim that:

- every copy-sensitive regression suite has already been exhaustively rehomed
- all behavior-heavy tests have been separated from copy-heavy tests
- copy ownership for every visible surface has already been fully normalized

Those remain later cleanup passes.

## Later Extraction Checklist

These items are still adjacent to Segment 5, but should not remain ambiguous in future cleanup.

`Move back toward Segment 1: graph followup actions + graph-slice-to-writing continuity`

- graph followup wording changes whose strongest evidence is route choice, not presentation
- coverage that only looks copy-like but is really asserting graph next-action semantics

When to move them:

- once the strongest evidence is route choice or graph-slice scope rather than wording stability

`Move back toward Segment 4: writing center continuity`

- wording-only changes attached to project resume, basket continuity, or theme provenance flows
- tests that appear copy-oriented but are really guarding post-entry state preservation

When to move them:

- once the strongest evidence is continuity semantics after entry rather than visible wording drift

`Keep in Segment 5 unless proven otherwise`

- `e7c2590` add and deduplicate Chinese copy regression coverage
- `ad4253a` earlier equivalent coverage pass
- copy-dominant parts of `30d4ba9`
- copy-dominant parts of `c5a115b`
- focused readiness-copy refinements such as `2137459`, `ebc5769`, `e1d97ef`, `15a766e`

Why they stay:

- these changes are best explained as protecting visible product wording
- moving them into Segment 1 or 4 would blur the line between behavior definition and presentation stability

## Immediate Next Move After This Note

After this note exists, the next practical step should be:

- use Segment 5 as the default home for copy-stability and copy-regression discussions
- stop treating copy-heavy tests as if they automatically define product-slice behavior
- challenge future changes by asking whether the strongest evidence is wording stability or actual routing / continuity logic
