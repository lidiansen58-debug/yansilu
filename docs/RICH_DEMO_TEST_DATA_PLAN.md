# Rich Demo Test Data Plan

Date: 2026-05-18

## Decision

Do not merge `feat/testing-data` into `main` as a whole.

Use `feat/testing-data` as a test-asset source branch. Pull useful fixture and seed ideas from it in small, reviewable changes, but keep `main`'s default test and demo baseline stable.

## Why

`feat/testing-data` mixes several kinds of change:

- useful smart-notes demo fixture expansion
- seed script and API test updates
- deletion of existing Yijing acceptance and knowledge-network fixtures
- changes to `vault-example/yansilu-vault/.yansilu/catalog.db`
- removal or rewriting of example vault notes

Those are not the same risk class. The smart-notes fixture work can help product demos and deeper system testing, but deleting the Yijing fixtures and changing the checked-in example vault would replace existing semantic baselines. If those changes enter `main` together, regressions become hard to diagnose because demo content, seed behavior, graph shape, and example vault state all move at once.

## Data Layers

### Main Baseline

Purpose:

- day-to-day development
- default `npm test`
- CI regression tests
- stable example behavior

Rules:

- Keep fixtures small, stable, and intentionally versioned.
- Keep existing Yijing acceptance and knowledge-network fixtures unless there is a separate product decision to replace them.
- Do not make rich demo data part of default CI unless the test is fast, deterministic, and scoped.
- Do not use checked-in SQLite database state as the source of truth for fixture behavior.

### Rich Demo Baseline

Purpose:

- product walkthroughs
- manual acceptance
- deeper graph and writing-flow checks
- scenario replay

Rules:

- Store source data as JSON fixtures under `tests/fixtures/`.
- Materialize demo vaults through seed scripts or API seed endpoints.
- Treat generated vaults as disposable outputs.
- Keep rich demo tests opt-in or separately named until they are proven stable enough for default CI.

### Generated Demo Vaults

Purpose:

- local demos
- exploratory QA
- screenshots and walkthrough recordings

Rules:

- Generate these from seed scripts.
- Do not hand-maintain `.db` files as long-term truth.
- Do not rewrite `vault-example/yansilu-vault` for every rich demo iteration.
- Prefer temporary vaults or a clearly named demo vault output path.

## Classification Of `feat/testing-data`

### Keep Or Extract

- `scripts/seed-smart-notes-product-thinking.mjs` improvements, after review
- `tests/fixtures/demo-smart-notes-product-thinking/demo.json`, if kept as a rich demo fixture
- `tests/unit/demo-smart-notes-fixture.test.mjs` updates that validate the rich fixture
- `tests/unit/web-prototype-api.test.mjs` updates for the smart-notes demo seed endpoint

### Keep Only With Explicit Product Decision

- changes that alter the default demo story
- changes that alter graph relation counts or semantic expectations used by existing demos
- changes that replace the Yijing demo as a product-facing baseline

### Do Not Carry Forward As Long-Term Assets

- deletion of `tests/fixtures/acceptance/yijing-rich-acceptance.json`
- deletion of `tests/fixtures/knowledge-network/yijing-network.json`
- checked-in changes to `vault-example/yansilu-vault/.yansilu/catalog.db`
- hand-generated or one-off changes under `vault-example/yansilu-vault/notes/`

## Implementation Path

1. Keep this planning branch documentation-only.
2. Create a small follow-up branch for the smart-notes rich fixture.
3. In that branch, restore compatibility with existing Yijing fixtures and default demo endpoints.
4. Add or preserve a clear fixture id, such as `smart-notes-product-thinking-rich-v1`.
5. Keep the seed path explicit, for example:
   - local script: `scripts/seed-smart-notes-product-thinking.mjs`
   - API endpoint: `/api/v1/demo/product-thinking/smart-notes`
6. Add focused tests for the rich fixture and seed behavior.
7. Keep rich demo vault generation out of checked-in `vault-example` state.

## Review Checklist For Future Test Data Changes

- Does this change affect default CI?
- Does it alter existing fixture counts or graph expectations?
- Does it delete a fixture used by an existing API, demo, or test?
- Is the data source a JSON fixture or a generated database?
- Can the demo vault be regenerated from source fixtures?
- If the demo changes product meaning, has that been approved as a product decision?

## Current Working Rule

`main` remains the stable baseline. Rich demo data may be added, but it must be additive, generated from fixtures, and separated from default example vault state unless there is an explicit decision to promote it.
