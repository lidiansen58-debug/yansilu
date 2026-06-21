# Chinese Copy Encoding Risk Audit

Date: 2026-06-21

This audit tracks historical mojibake in user-facing Chinese copy and tests. The goal is not to clean every string in one pass, but to make the risk visible and repeatable before a dedicated cleanup goal.

Run:

```bash
npm run audit:mojibake
```

Current baseline:

| Area | Files | Markers |
| --- | ---: | ---: |
| Replacement-marker corruption | 1 | 452 |
| UTF-8-as-GBK style corruption | 4 | 10 |
| Total | 5 | 462 |

## Current Hotspots

| File | Risk | Notes |
| --- | --- | --- |
| `tests/e2e/prototype-browser.test.mjs` | High maintenance cost | Browser fixtures and assertions contain most replacement-marker corruption. This makes tests harder to read and can preserve broken copy as expected behavior. |
| `apps/web/src/components-editor-pane.js` | User-facing copy risk | At least two loading/error strings still contain corrupted Chinese. These should be among the first source strings cleaned. |
| `apps/web/src/graph-ai-candidates.js` | Logic/copy coupling risk | Candidate filtering recognizes corrupted phrases. Before deleting these patterns, confirm whether they protect against persisted legacy data. |
| `tests/unit/web-ai-inbox-panel.test.mjs` | Test coupling risk | A negative assertion matches corrupted loading copy, so it may keep obsolete text alive. |
| `tests/unit/web-source-note-editor-gating.test.mjs` | Fixture risk | A source-note fixture includes corrupted section text. This is probably safe to rewrite once the intended fixture meaning is clear. |

## Cleanup Order

1. Clean source UI copy first.
   Replace corrupted user-facing strings in `apps/web/src/components-editor-pane.js` with readable Chinese. Update tests to assert the readable copy or stable DOM state.

2. Split legacy-data tolerance from UI copy.
   In `apps/web/src/graph-ai-candidates.js`, keep any needed legacy matching as named constants with comments, but avoid letting corrupted strings appear as new UI copy.

3. Rewrite browser fixtures in batches.
   `tests/e2e/prototype-browser.test.mjs` should move from corrupted Chinese fixtures to readable Chinese or English fixtures. Prefer stable selectors/state checks over matching corrupted rendered text.

4. Add a no-new-risk gate later.
   The audit script currently reports the baseline but does not fail CI. After cleanup reduces known hotspots, add a fail mode or a snapshot threshold to prevent new mojibake from entering source and tests.

## Rules For Future Work

- Do not add new assertions that expect corrupted Chinese copy.
- Prefer DOM attributes, API state, or readable Chinese text in tests.
- If a corrupted phrase must remain for legacy-data compatibility, isolate it in a named constant and add a short comment explaining why.
- Keep generated vendor bundles excluded from audit results.
