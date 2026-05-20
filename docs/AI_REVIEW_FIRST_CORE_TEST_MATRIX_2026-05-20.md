# AI Review-First Core Test Matrix

Status: must keep.

Purpose:

- Preserve the review-first contract across sqlite / non-sqlite / API / web UI / browser flow.
- Make future hardening work safer by identifying the minimum tests that directly prove the capability chain still holds.

## Contract and Canonical Shape

- `tests/integration/api-ai-canonical-contract.test.mjs`
  Proves stable canonical shapes for inbox detail, suggestion detail, and review action responses.
- `tests/integration/api-ai-canonical-response.test.mjs`
  Proves AI inbox and scheduled task APIs still expose canonical payloads.
- `tests/integration/api-ai-suggestions-canonical.test.mjs`
  Proves AI suggestion lifecycle responses still expose canonical payloads.

## Reject Consistency

- `tests/unit/api-ai-suggestion-reject-runtime.test.mjs`
  Proves non-sqlite reject keeps suggestion + linked artifact semantics aligned, including rollback on injected failure.
- `tests/integration/api-ai-suggestion-reject-consistency.test.mjs`
  Proves sqlite-backed API reject keeps suggestion + linked artifact semantics aligned.
- `tests/integration/api-notes.test.mjs`
  Must retain the reject path inside `notes AI analysis API stores reviewable local candidates without confirming relations`.

## Stale and Duplicate Guards

- `tests/unit/web-ai-inbox-stale-state-runtime.test.mjs`
  Proves inbox detail, summary, evaluation, and list/detail refresh interleave do not leak stale state.
- `tests/unit/web-ai-suggestions-runtime.test.mjs`
  Proves suggestion detail refresh, edited content capture, duplicate submit guard, and stale selection handling.

## Traceability and Missing-State UI

- `tests/unit/web-ai-inbox-panel.test.mjs`
  Must retain traceability coverage, stale detail suppression, and target-missing placeholder coverage.
- `tests/unit/web-ai-suggestions-panel.test.mjs`
  Must retain target-missing trace placeholder and stale detail suppression coverage.

## Browser Evidence

- `tests/e2e/prototype-browser.test.mjs`
  Must retain:
  - `prototype AI inbox field suggestion flow adopts a suggestion as draft and updates the target note`
  - `prototype AI inbox reviewed detail can mark an adopted draft edited and then confirmed`
  - `prototype AI inbox can reject a linked suggestion and keeps the reviewed artifact inspectable`
  - `prototype AI inbox reject plus refresh keeps the reviewed artifact stable`
  - `prototype settings AI suggestions panel edits confirms and rejects suggestions through the real review flow`
  - `prototype settings AI suggestions guards stale detail selection and duplicate review submits`

## Legacy Compatibility

- `tests/integration/api-ai-legacy-revised-compat.test.mjs`
  Proves sqlite legacy `revised` rows remain readable until a real migration happens.
- `tests/integration/api-vault-settings.test.mjs`
  Proves summarize still writes `revised`, which is why a migration script is not appropriate yet.

Interpretation:

- If one of these tests is removed, renamed, or substantially weakened, replace it with coverage of equal or greater scope in the same review-first category.
- Passing broader suites is not a substitute unless they directly prove the same invariant.

Run commands:

- `npm run test:review-first:core`
- `npm run test:review-first:browser`
- `npm run test:review-first:all`
