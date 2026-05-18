# wt-public Ownership

Date: 2026-05-18

## Purpose

`wt-public` is the public-facing product and demo worktree for Yansilu. It exists to keep the official site, demo showcase, marketing copy, and rich demo asset entry moving together without mixing that work into core workflow, desktop runtime, import pipeline, or AI-layer threads.

## Primary Responsibilities

- Official website: homepage, product page, pricing, download, account-facing marketing surfaces, and shared public navigation.
- Demo showcase: `/demo`, `/demo/zettelkasten`, `/demo/yijing`, and the public path that explains which demo to open first.
- Marketing copy: positioning, landing-page copy, pricing/download copy, CTA language, and customer-facing product explanations.
- Rich demo asset entry: links and docs that point to the canonical fixture, seed script, API seed endpoint, prototype query string, and demo playbooks.

## Owned Files

- `apps/web/src/marketing-*`
- `apps/web/src/marketing.css`
- public route checks under `tests/e2e/marketing-routes.test.mjs`
- public/demo docs such as:
  - `docs/MARKETING_SITE_REDESIGN_V2.md`
  - `docs/MARKETING_SITE_PRODUCT_DOC.md`
  - `docs/MARKETING_SITE_HOMEPAGE_V1.md`
  - `docs/OFFICIAL_SITE_AND_DEMO_REPLAN_2026-05-16.md`
  - `docs/RICH_DEMO_USAGE_ENTRY.md`
  - `docs/DEMO_PLAYBOOK_SMART_NOTES_3_MIN.md`
  - `docs/DEMO_PLAYBOOK_YIJING_SECONDARY_CASE.md`
  - `docs/growth/**`

## Shared Or Coordinated Files

- `apps/api/src/server.mjs`: only touch public auth, billing, checkout, download, or demo seed endpoints when the public surface requires it.
- `apps/web/src/prototype-*`: only touch demo query-string entry behavior, and coordinate with core workflow owners before changing the main app shell.
- `tests/fixtures/demo-smart-notes-product-thinking/**`: safe for rich demo fixture work, but fixture changes must preserve deterministic seeding and focused tests.
- `scripts/seed-smart-notes-product-thinking.mjs`: safe for rich demo asset entry and seed fixes.

## Out Of Scope

- Core note/editor/graph/writing workflow redesign beyond demo entry needs.
- Desktop packaging, Tauri runtime, installer, updater, and file-dialog behavior.
- Import pipeline parsing, rollback, and connector business rules unless public demo copy points to them.
- AI provider routing, model packs, and agent infrastructure except for public-facing copy about AI boundaries.
- Generated vaults, generated SQLite files, and local demo runtime state.

## Runtime

This worktree has an ignored local `.env.worktree`:

```text
API_PORT=3200
WEB_PORT=5373
VAULT_PATH=E:/Projects/Thinking in Notes/.local-demo-vaults/wt-public/yansilu-vault
```

Run it with:

```powershell
npm run wt:run -- -Target all
```

Then open:

- `http://localhost:5373/`
- `http://localhost:5373/product`
- `http://localhost:5373/demo`
- `http://localhost:5373/demo/zettelkasten`
- `http://localhost:5373/demo/yijing`

## Verification

Use focused public-surface checks first:

```powershell
node --test tests/e2e/marketing-routes.test.mjs
node --test tests/unit/demo-smart-notes-fixture.test.mjs tests/unit/web-prototype-api.test.mjs
```

Before merging a substantial public-site slice, also browser-check desktop and 375px mobile widths for `/`, `/product`, `/pricing`, `/download`, `/demo`, `/demo/zettelkasten`, and `/demo/yijing`.

## Merge Rule

Merge back through the main checkout only after the public routes, demo entry points, and relevant fixture tests pass. Keep generated local demo vaults out of commits.
