# Product Main Path Commit Allocation 2026-05-22

This note maps key commits from the former `feat/product-main-path-followup` long-lived integration line into the current segment model.

Reference:

- [PRODUCT_MAIN_PATH_LONG_LINE_RESEGMENTATION_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_LONG_LINE_RESEGMENTATION_2026-05-22.md)
- [PRODUCT_MAIN_PATH_SEGMENT_BOUNDARY_MATRIX_2026-05-22.md](E:/Projects/Thinking%20in%20Notes/yansilu/docs/PRODUCT_MAIN_PATH_SEGMENT_BOUNDARY_MATRIX_2026-05-22.md)

## Segment Short Labels

- `R` = `main-path / writing readiness`
- `G` = `graph followup actions + graph-slice-to-writing continuity`
- `W` = `writing center continuity`
- `C` = `copy / regression tests / Chinese copy coverage`

## Scope

This is not a full git history dump.
This is a practical allocation list for the key commits that define or support the product main-path cleanup work.

Use it when:

- explaining why a commit belongs to one segment instead of another
- deciding which commits are the best anchors for future cleanup
- building future PRs or follow-up docs around the segment model

## Core Allocation

| Commit | Segment | Why it belongs there |
| --- | --- | --- |
| `00c1702` Add product core main-path workflow | `R` | establishes the main-path workflow baseline |
| `3b1e46f` stabilize note main-path relation, writing entry, and fallback state | `R` | mixed file surface, but strongest effect is main-path guidance and readiness |
| `6804483` isolate legacy inspector main-path helpers | `R` | separates main-path judgment logic into cleaner boundaries |
| `09d282e` Improve main-path relation guidance | `R` | readiness and relation-guidance refinement |
| `0d64f45` Add relation guidance unit coverage | `R` | direct readiness and relation-guidance coverage |
| `05fae7e` Improve relation form guidance defaults | `R` | relation-readiness guidance rather than routing |
| `1259da1` Improve relation guidance prompts | `R` | readiness-facing guidance |
| `b436c76` Add writing readiness tiers | `R` | readiness thresholding |
| `c82e4bc` Unify main-path writing readiness signals | `R` | readiness semantics |
| `fa8d3b3` Align writing readiness status language | `R` | readiness-facing language anchored in readiness semantics |
| `15a766e` Unify shared writing readiness copy | `R` | readiness-facing wording tied to readiness layer |
| `ebc5769` Refine writing readiness copy hierarchy | `R` | still grounded in readiness semantics |
| `2137459` Tighten main-path summary copy | `R` | summary copy attached to readiness judgment |
| `71c6c67` Fix writing readiness relation semantics | `R` | readiness semantics directly |
| `ea4c650` Align explicit relation readiness handling | `R` | readiness rule alignment |
| `d5ec210` refine main-path relation guidance wording | `R` | readiness-facing relation guidance |
| `03b77f5` Drive graph followup actions | `G` | starts graph followup action path |
| `eb8c20b` Polish graph followup affordances | `G` | graph followup path refinement |
| `f23e8c5` Codify graph followup actions | `G` | stabilizes graph action vocabulary |
| `5a394f7` Carry graph followup action context | `G` | graph action context propagation |
| `31ba692` Align graph followup action mapping | `G` | graph action routing semantics |
| `3add766` Preserve bridge path followup context | `G` | graph bridge followup semantics |
| `f9fd242` prioritize isolated notes in graph next actions | `G` | graph next-step priority rule |
| `698140e` keep sparse graph slices in relation-building mode | `G` | graph routing rule before writing |
| `638b940` refine graph and theme continuity guidance | `G` | mostly graph followup semantics with continuity framing |
| `d7dab8e` keep graph next actions focused on rationale gaps | `G` | graph next-action prioritization |
| `c19cca3` preserve graph slice continuity into writing center | `G` | core graph-slice handoff boundary |
| `c6d4e0c` Tighten graph followup continuity into writing center | `G` | final graph-to-writing continuity seal |
| `b13c724` Reset writing state when switching entry context | `W` | writing-state continuity baseline |
| `f1e912f` Fix writing entry state resets | `W` | post-entry continuity |
| `be524d3` Unify import writing project entry reset | `W` | entry-state continuity |
| `3c71ce2` Cover import writing project entry reset behavior | `W` | continuity coverage |
| `958e14b` unify writing entry reset flow | `W` | continuity rule unification |
| `53838af` preserve writing theme context on basket updates | `W` | theme provenance continuity |
| `a12f07f` preserve writing theme context on basket updates | `W` | same continuity theme in later branch pass |
| `eddcf6c` preserve theme entry continuity across equivalent note sets | `W` | post-entry theme continuity |
| `391a405` resume current project from theme list | `W` | project resume continuity |
| `5f9114d` Smooth writing center project flow | `W` | writing-center continuity layer |
| `8920de4` Refine writing theme project entry readiness | `W` | despite “readiness” wording, strongest evidence is theme-entry continuity after entry |
| `e7c2590` add and deduplicate Chinese copy regression coverage | `C` | explicit copy regression protection |
| `ad4253a` earlier equivalent copy coverage pass | `C` | same copy-regression layer |
| `30d4ba9` refine main-path and writing-center flow and copy | `C` | mixed change, but best remembered as copy-heavy support rather than core routing |
| `c5a115b` earlier equivalent flow-and-copy refinement pass | `C` | same as above |

## Important Mixed Or Borderline Cases

These are the commits most likely to be argued about.

### `30d4ba9`

- default allocation: `C`
- reason: it touches behavior-adjacent surfaces, but the segment model benefits most from remembering it as a copy-heavy support commit
- warning: if you need to isolate only the behavior change inside it, re-open at file level rather than moving the whole commit

### `3b1e46f`

- default allocation: `R`
- reason: even though it touches writing entry and fallback state, its strongest historical role in this cleanup model is stabilizing the main-path relation and guidance loop

### `8920de4`

- default allocation: `W`
- reason: the strongest interpretation is still theme-entry continuity and project-entry persistence after entry, not pre-entry readiness judgment

### `638b940`

- default allocation: `G`
- reason: it lives closest to graph followup guidance and the graph-to-next-step layer, even if theme continuity language is involved

## Supplemental Coverage Commits

These are useful support commits but are not the clearest anchor commits for the segment definitions.

| Commit | Best fit | Note |
| --- | --- | --- |
| `2ae5cbf` Add writing readiness consistency e2e | `R` | supporting readiness coverage |
| `26f269b` Add writing readiness project-state e2e | `R` | supporting readiness coverage |
| `2f4d1fd` Tighten writing flow readiness e2e assertions | `R` | readiness-facing e2e support |
| `0c8b5b4` Add import writing project failure coverage | `W` | continuity failure-mode support |
| `7ad2ab7` Add unit coverage for cold-start theme entry | `W` | theme-entry continuity support |
| `a5eb541` Fix cold-start theme entry readiness | `W` | despite the word readiness, strongest evidence is theme-entry continuity behavior |

## Commits Intentionally Left Out

This document intentionally does not try to allocate:

- unrelated AI platform commits
- paper workspace commits
- general branch merges with no stable product-main-path semantics of their own
- every single test-only commit outside the main path cleanup scope

If one of those needs allocation later, route it using the boundary matrix first, then append it here.

## Immediate Use

Use this allocation note when:

- preparing future cleanup PRs
- deciding which past commits to cite in a segment-specific discussion
- explaining why a code or test change belongs to `R`, `G`, `W`, or `C`
