# AI Platform Follow-up Merge Batch

Scope:
- AI inbox review action hardening only
- Canonical / store / API stability only
- No product main-path UI redesign
- No paper workspace or demo scope
- No provider architecture refactor

Included change themes:
- `accept-link` compensation and duplicate-submit idempotency
- `promote-to-note` compensation and duplicate-submit idempotency
- `adopt-field-suggestion` compensation and duplicate-submit idempotency
- degraded canonical inbox detail when linked suggestion records are missing
- helper extraction from `apps/api/src/server.mjs` into `packages/ai-orchestrator/src/inbox-review-actions.mjs`
- review-first regression cases registered in `tests/unit/review-first-test-matrix.test.mjs`

Key touched areas:
- `apps/api/src/server.mjs`
- `packages/ai-orchestrator/src/inbox-review-actions.mjs`
- `packages/ai-orchestrator/src/index.mjs`
- `tests/integration/api-ai-canonical-contract.test.mjs`
- `tests/integration/api-ai-canonical-response.test.mjs`
- `tests/integration/api-notes.test.mjs`
- `tests/integration/api-vault-settings.test.mjs`
- `tests/integration/api-ai-field-adoption-rollback.test.mjs`
- `tests/unit/api-ai-accept-link-runtime.test.mjs`
- `tests/unit/api-ai-field-adoption-runtime.test.mjs`
- `tests/unit/api-ai-promote-note-runtime.test.mjs`
- `tests/unit/review-first-test-matrix.test.mjs`

Merge intent:
- Ship as AI platform hardening
- Reviewer focus should be action idempotency, rollback behavior, canonical degraded contracts, and helper ownership boundaries

Must-run regression set:
- `node --test .\tests\unit\review-first-test-matrix.test.mjs`
- `node --test .\tests\unit\api-ai-accept-link-runtime.test.mjs .\tests\unit\api-ai-field-adoption-runtime.test.mjs .\tests\unit\api-ai-promote-note-runtime.test.mjs`
- `node --test .\tests\integration\api-ai-field-adoption-rollback.test.mjs .\tests\integration\api-ai-canonical-contract.test.mjs .\tests\integration\api-ai-canonical-response.test.mjs .\tests\integration\api-vault-settings.test.mjs .\tests\integration\api-notes.test.mjs`

Expected invariants:
- Repeating `accept-link` does not append another `linked_to_note` decision
- Repeating `promote-note` does not append another `promoted_to_note` decision
- Repeating `adopt-field-suggestion` does not append another `adopted_as_draft` decision
- Failed review actions do not leave behind half-written notes or relations
- Canonical inbox detail keeps a stable shape even when linked suggestion rows are missing
