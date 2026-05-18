# Rich Demo Usage Entry

Date: 2026-05-18

## Purpose

Use rich demo data to test the system and build product demos without replacing `main`'s stable fixture baseline.

This document is the operational entry point. The broader data-governance rule lives in `docs/RICH_DEMO_TEST_DATA_PLAN.md`.

## Current Rich Demo

The current rich demo asset is the smart-notes product-thinking demo:

- fixture: `tests/fixtures/demo-smart-notes-product-thinking/demo.json`
- seed script: `scripts/seed-smart-notes-product-thinking.mjs`
- API seed endpoint: `/api/v1/demo/product-thinking/smart-notes`
- app entry: `/prototype?demo=smart-notes-product-thinking`
- talk track: `docs/DEMO_PLAYBOOK_SMART_NOTES_3_MIN.md`
- content spec: `docs/DEMO_SMART_NOTES_PM_FLOW.md`

## Local Demo Vault

Generate rich demo data into a disposable vault, not into the checked-in `vault-example` baseline.

Example:

```powershell
$env:DEMO_VAULT="E:\Projects\Thinking in Notes\.local-demo-vaults\smart-notes-product-thinking"
node scripts/seed-smart-notes-product-thinking.mjs --vault $env:DEMO_VAULT
```

The command is intended to be idempotent. Running it again should update the same demo records instead of duplicating notes, relations, index cards, writing projects, or draft scaffolds.

## Fixture Override

Use `--fixture` only when testing a candidate fixture that is not yet the default:

```powershell
node scripts/seed-smart-notes-product-thinking.mjs `
  --vault $env:DEMO_VAULT `
  --fixture tests/fixtures/demo-smart-notes-product-thinking/demo.json
```

Candidate fixtures should stay JSON-first. Avoid treating generated markdown files or SQLite files as the source of truth.

## App Flow

For the interactive prototype, use:

```text
/prototype?demo=smart-notes-product-thinking
```

The app should call the public API seed endpoint and open the seeded workspace. This keeps the browser demo aligned with the same fixture and seed path used by local scripts and tests.

## Validation

Before relying on the demo for walkthroughs, run the focused validation tests:

```powershell
node --test tests/unit/demo-smart-notes-fixture.test.mjs tests/unit/web-prototype-api.test.mjs
```

These tests check the fixture shape and public prototype API calls. Broader API seeding coverage can be run through the integration test that includes the smart-notes demo endpoint:

```powershell
node --test tests/integration/api-knowledge-network-yijing.test.mjs
```

## Commit Rules

Safe to commit:

- JSON fixture changes under `tests/fixtures/demo-smart-notes-product-thinking/`
- seed script changes under `scripts/seed-smart-notes-product-thinking.mjs`
- focused tests for fixture shape, seed behavior, and API entry points
- demo playbooks and usage documentation

Do not commit as rich demo source assets:

- generated `.db` files
- generated local demo vaults
- one-off markdown files produced by a local seed run
- deletions of existing Yijing acceptance or knowledge-network fixtures
- broad changes to `vault-example/yansilu-vault`

## Promotion Checklist

Before a rich demo change is promoted into `main`, verify:

- the change is additive or explicitly approved as a product baseline replacement
- existing Yijing demo fixtures still exist
- default tests still pass or only gain focused rich-demo checks
- the demo can be regenerated from fixture plus seed script
- no generated vault or SQLite database state is included
- the app entry, script entry, and tests all point at the same fixture source
