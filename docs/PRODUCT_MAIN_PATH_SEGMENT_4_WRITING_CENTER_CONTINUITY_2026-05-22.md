# Product Main Path Segment 4 Writing Center Continuity 2026-05-22

This note starts the first dedicated closure pass for the `writing center continuity` segment that was previously mixed into the long-lived `feat/product-main-path-followup` integration line.

Reference:

- [PRODUCT_MAIN_PATH_LONG_LINE_RESEGMENTATION_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_LONG_LINE_RESEGMENTATION_2026-05-22.md)
- [PRODUCT_MAIN_PATH_SEGMENT_1_GRAPH_FOLLOWUP_CLOSURE_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_SEGMENT_1_GRAPH_FOLLOWUP_CLOSURE_2026-05-22.md)

## Segment Name

- `writing center continuity`

## Why This Segment Exists Separately

Segment 1 already established that graph followup has its own mature decision path.
What remains adjacent but distinct is the continuity behavior inside writing center itself:

- keeping the writing basket stable
- preserving theme provenance
- preserving source-index provenance
- reopening or resuming the right writing project
- avoiding destructive state resets when the entry path changes

This segment should therefore absorb continuity logic that is not fundamentally about graph next-action selection.

## Segment Scope

In scope:

- writing basket continuity across entry paths
- theme index continuity and provenance retention
- source index continuity
- project resume / reopen continuity
- writing-entry reset semantics
- writing-center flow continuity tests and guardrails

Out of scope for this pass:

- graph next-action selection itself
- graph-slice scoping rules when entering writing from graph
- broad main-path readiness semantics
- Chinese copy coverage as an independent concern

## Mature Core

These commits form the mature writing-center continuity spine:

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

What is considered mature:

- writing entry paths are no longer allowed to reset project state arbitrarily
- theme-related entry paths preserve more provenance than before
- writing continuity now treats basket, project, and source index as connected state rather than isolated toggles

## Mixed In But Not Core To This Segment

These changes often touch the same files, but they should not define Segment 4:

- `03b77f5`, `eb8c20b`, `f23e8c5`, `5a394f7`, `31ba692`, `3add766`, `f9fd242`, `698140e`, `638b940`, `d7dab8e`
- `c19cca3`, `c6d4e0c`
- `30d4ba9` copy-heavy changes
- `e7c2590` Chinese copy regression coverage

How to treat them:

- keep graph-triggered handoff scope in Segment 1
- keep copy-dominant and regression-coverage concerns in Segment 5
- only keep a change in Segment 4 if the strongest evidence is about preserving continuity inside writing center itself

## Boundary Against Segment 1

Segment 1 is about deciding whether graph should send the user to writing and, if so, whether that handoff remains graph-slice scoped.

Segment 4 is about what writing center does after the user gets there:

- whether basket state is preserved
- whether source indexes remain attached
- whether the same writing project should resume
- whether a theme entry path reuses rather than resets context

If a change can be described as “after entry, preserve the right writing state,” it belongs here by default.

## Primary Evidence Files

Core behavior evidence:

- `apps/web/src/prototype-app.js`
- `apps/web/src/writing-center-flow.js`

Direct supporting coverage:

- `tests/unit/web-note-browser-actions.test.mjs`
- `tests/unit/web-writing-center-flow.test.mjs`

Supporting but not defining:

- `tests/unit/web-main-path-summary.test.mjs`
- `tests/unit/web-graph-followup.test.mjs`

## Evidence Mapping Table

| Segment 4 concern | Primary file evidence | Primary test evidence | Representative commit themes |
| --- | --- | --- | --- |
| writing entry reset semantics | `apps/web/src/prototype-app.js` | `tests/unit/web-note-browser-actions.test.mjs` | `b13c724`, `f1e912f`, `be524d3`, `958e14b` |
| theme provenance and continuity | `apps/web/src/prototype-app.js` | `tests/unit/web-note-browser-actions.test.mjs`, `tests/unit/web-writing-center-flow.test.mjs` | `53838af`, `a12f07f`, `eddcf6c` |
| project resume / reopen continuity | `apps/web/src/prototype-app.js`, `apps/web/src/writing-center-flow.js` | `tests/unit/web-note-browser-actions.test.mjs`, `tests/unit/web-writing-center-flow.test.mjs` | `391a405`, `5f9114d`, `8920de4` |
| graph-triggered handoff that should stay out of Segment 4 core | `apps/web/src/graph-followup.js`, `apps/web/src/prototype-app.js` | `tests/unit/web-graph-followup.test.mjs` | `c19cca3`, `c6d4e0c` |
| copy / regression coverage that should stay out of Segment 4 core | copy and regression surfaces | copy and regression suites | `30d4ba9`, `e7c2590` |

Reading rule:

- if the strongest evidence is about preserving state after entry, it is probably Segment 4
- if the strongest evidence is about graph deciding the next step, it is probably Segment 1
- if the strongest evidence is mostly wording or regression snapshots, it is probably Segment 5

## Execution Checklist

Use this checklist when discussing whether Segment 4 is actually closed as a product slice.

`Segment identity`

- writing center continuity is treated as its own segment, not as a leftover bucket under graph followup
- continuity here refers to preserving the right writing state after entry, not to graph next-step semantics

`Behavior requirements`

- writing entry paths do not unnecessarily reset basket, provenance, or project context
- theme-based entry paths preserve enough context to avoid false cold starts
- the system can resume or continue the current writing project when that is the correct continuity path
- reset behavior is unified enough that import / theme / direct note entry do not fork unpredictably

`Non-goals for this segment`

- do not use Segment 4 to decide graph next-action ordering
- do not use Segment 4 to absorb all copy cleanup
- do not use Segment 4 as a substitute for main-path readiness semantics

## Current Closure Statement

This segment should now be treated as:

- a distinct continuity layer inside writing center
- separate from graph followup itself
- responsible for preserving state across writing entry and resume paths

## What This Closure Does Not Yet Claim

This note does not claim that:

- all writing-center continuity edge cases have already been independently re-tested
- all graph-triggered handoff code has been fully separated from writing continuity helpers
- all copy and regression suites have been reassigned cleanly

Those remain later cleanup passes.

## Immediate Next Move After This Note

After this note exists, the next practical step should be:

- use Segment 4 as the default home for basket / theme / project continuity discussions
- stop treating theme continuity and project resume logic as merely “mixed into graph”
- challenge future changes by asking whether their strongest evidence is post-entry writing continuity rather than graph-triggered routing
