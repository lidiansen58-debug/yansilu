# Product Main Path Segment Boundary Matrix 2026-05-22

This note is a cross-segment routing matrix for the product main-path cleanup work.

It should be used after the segment closure notes already exist:

- [PRODUCT_MAIN_PATH_SEGMENT_MAIN_PATH_WRITING_READINESS_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_SEGMENT_MAIN_PATH_WRITING_READINESS_2026-05-22.md)
- [PRODUCT_MAIN_PATH_SEGMENT_1_GRAPH_FOLLOWUP_CLOSURE_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_SEGMENT_1_GRAPH_FOLLOWUP_CLOSURE_2026-05-22.md)
- [PRODUCT_MAIN_PATH_SEGMENT_4_WRITING_CENTER_CONTINUITY_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_SEGMENT_4_WRITING_CENTER_CONTINUITY_2026-05-22.md)
- [PRODUCT_MAIN_PATH_SEGMENT_5_COPY_AND_REGRESSION_COVERAGE_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_SEGMENT_5_COPY_AND_REGRESSION_COVERAGE_2026-05-22.md)

## Purpose

This file answers one question:

- when a future change touches the product main path, which segment should own it by default

This matrix is not the source of truth for the segment definitions.
The segment notes remain the primary definitions.
This matrix exists to reduce routing ambiguity.

## Segment Short Labels

- `R` = `main-path / writing readiness`
- `G` = `graph followup actions + graph-slice-to-writing continuity`
- `W` = `writing center continuity`
- `C` = `copy / regression tests / Chinese copy coverage`

## Boundary Matrix

| Change pattern | Default owner | Strongest evidence usually lives in | Common false classification | Routing rule |
| --- | --- | --- | --- | --- |
| deciding whether a note is ready enough to move forward | `R` | `components-editor-pane.js`, `writing-readiness.js`, readiness unit tests | `G` or `C` | If the core question is "is this ready enough," keep it in `R` |
| deciding the next action from graph | `G` | `graph-followup.js`, `prototype-app.js`, graph followup unit tests | `R` | If the core question is "what should graph tell the user to do next," keep it in `G` |
| preserving graph-slice scope when entering writing | `G` | `graph-followup.js`, `prototype-app.js`, graph followup unit tests | `W` | If the issue is about whether graph broadens or preserves the slice, keep it in `G` |
| preserving basket / project / provenance after writing entry | `W` | `prototype-app.js`, `writing-center-flow.js`, writing continuity tests | `G` | If the route is already chosen and the question is about state after entry, keep it in `W` |
| resuming the correct current writing project | `W` | `prototype-app.js`, `writing-center-flow.js`, note-browser and writing-center tests | `R` | If the problem is about continuity after entry, not readiness before entry, keep it in `W` |
| refining wording of visible path guidance | `C` | UI text, copy-oriented tests, copy regression suites | `R`, `G`, or `W` | If behavior does not change and wording is the real concern, keep it in `C` |
| adding Chinese copy regression protection | `C` | `*copy*.test.mjs`, copy-oriented e2e/unit tests | any other segment | If the work mainly prevents copy drift, keep it in `C` |
| tests that assert route choice or state transitions, even if they contain strings | `R`, `G`, or `W` depending on behavior | behavior tests | `C` | Do not route a test to `C` just because it contains user-facing strings |
| tests that exist mainly to freeze wording and visible labels | `C` | copy-oriented suites | behavior segments | If the strongest failure mode is wording drift, keep it in `C` |

## Fast Decision Rules

When a change feels ambiguous, ask these questions in order:

1. Is the change deciding readiness?
   Then default to `R`.

2. Is the change deciding the next graph followup route?
   Then default to `G`.

3. Is the change preserving or resuming the right writing state after entry?
   Then default to `W`.

4. Is the change mainly stabilizing wording, labels, or copy regressions?
   Then default to `C`.

## High-Confusion Cases

### Readiness wording vs copy-only wording

- If wording changes because readiness semantics changed, default to `R`.
- If semantics stay the same and only phrasing is being polished or regression-protected, default to `C`.

### Graph-to-writing handoff vs writing continuity after entry

- If the question is whether graph should preserve the current slice when it routes to writing, default to `G`.
- If the question is what writing should preserve after the route has already happened, default to `W`.

### Tests with visible copy and real behavior

- If the test would still matter even if the strings changed, it is probably a behavior test and belongs with `R`, `G`, or `W`.
- If the test mostly exists because the strings must not drift, it belongs with `C`.

## File-Level Heuristic

This is only a heuristic, not a rule.

- `apps/web/src/graph-followup.js` usually points to `G`
- `apps/web/src/writing-readiness.js` usually points to `R`
- `apps/web/src/writing-center-flow.js` usually points to `W`
- `tests/unit/*copy*.test.mjs` and `tests/e2e/*copy*.test.mjs` usually point to `C`
- `apps/web/src/prototype-app.js` is shared and must be classified by behavior, not by filename alone

## Anti-Patterns

Avoid these routing mistakes:

- putting every visible-text change into `C` even when it reflects a readiness or continuity rule change
- putting every `prototype-app.js` change into `W` even when it is actually graph routing
- treating copy-heavy tests as if they define product semantics by themselves
- treating readiness messages as pure copy when they actually encode a product threshold

## Immediate Use

Use this matrix when:

- reviewing future long-line cleanup docs
- deciding where a past commit should be rehomed
- deciding whether a new change belongs to readiness, graph, writing continuity, or copy protection
