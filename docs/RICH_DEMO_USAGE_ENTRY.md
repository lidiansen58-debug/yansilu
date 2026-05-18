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

Recommended presenter flow:

1. Open `/demo/zettelkasten` to frame the story.
2. Open `/prototype?demo=smart-notes-product-thinking` to auto-seed the demo and open the guide note.
3. Walk through source, fleeting notes, literature notes, permanent notes, graph, index cards, writing project, scaffold, and essay in that order.

Optional clean-recording flow:

1. Delete or replace the disposable local vault if it may contain exploratory changes.
2. Open `/demo/zettelkasten` to frame the story.
3. Open `/prototype?demo=smart-notes-product-thinking`; the app will call the public seed endpoint and start at `GUIDE-SN-001`.

## Local Demo Vault

Generate rich demo data into a disposable vault, not into the checked-in `vault-example` baseline.

Example:

```powershell
$env:DEMO_VAULT="E:\Projects\Thinking in Notes\.local-demo-vaults\smart-notes-product-thinking"
node scripts/seed-smart-notes-product-thinking.mjs --vault $env:DEMO_VAULT
```

The command is intended to be idempotent. Running it again should update the same demo records instead of duplicating notes, relations, index cards, writing projects, or draft scaffolds.

The path under `.local-demo-vaults` is disposable/generated runtime output. It is safe to delete before a clean recording and seed again. It should not be curated by hand, copied into `vault-example`, or committed.

Use a separate disposable vault for important demos if the current local vault may contain exploratory changes.

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

The app calls the public API seed endpoint, opens the seeded workspace, and selects the guide note `GUIDE-SN-001`. This keeps the browser demo aligned with the same fixture and seed path used by local scripts and tests while giving presenters a stable first screen.

For the narrative page, start with:

```text
/demo/zettelkasten
```

The story page explains why the demo is about source-informed product thinking rather than generic note storage. The prototype is the hands-on walkthrough.

## Originality Boundary

The smart-notes demo may reference *How to Take Smart Notes* as source material, but it must remain a product demo built from original paraphrases and product-manager restatements.

Do not use the demo to reproduce book text, long passages, chapter-level paraphrase, or a substitute summary. The point is to show Yansilu's workflow: source trace, user paraphrase, owned judgment, typed relations, question-centered index cards, and traceable writing.

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

For documentation-only branches, keep the status even narrower: only `docs/` files should change. Do not modify `tests/fixtures`, `scripts`, `vault-example`, `.yansilu`, or package files.

## Promotion Checklist

Before a rich demo change is promoted into `main`, verify:

- the change is additive or explicitly approved as a product baseline replacement
- existing Yijing demo fixtures still exist
- default tests still pass or only gain focused rich-demo checks
- the demo can be regenerated from fixture plus seed script
- no generated vault or SQLite database state is included
- the app entry, script entry, and tests all point at the same fixture source
