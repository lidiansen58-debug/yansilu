# yansilu

Monorepo scaffold for Yansilu (Thinking in Notes).

## Structure
- apps/: web, desktop, api, worker
- packages/: core domain and engines
- schemas/: JSON Schemas for structured data/AI outputs
- docs/: product and technical docs
- vault-example/: sample local vault
- tests/: unit / integration / e2e

## Vault Convention
- `vault-example/yansilu-vault/notes/` is the source of truth for user content.
- `vault-example/yansilu-vault/.yansilu/` stores cache/index/config only.

## Local Run (MVP)
- `npm run dev` starts API (`3000`), Web (`5173`), Worker (heartbeat).
- `npm run dev:api` starts API only.
- `npm run dev:web` starts Web only.
- `npm run dev:worker` starts Worker only.
- Web prototype page: `http://localhost:5173/` (same as `/prototype`).

## Desktop Bundles
- `npm run build:desktop` uses platform defaults:
- Windows: `nsis`
- Linux: `deb` + `appimage`
- macOS: `app` + `dmg`
- `npm run build:desktop:nsis` builds Windows NSIS installer explicitly.
- `npm run build:desktop:msi` builds Windows MSI explicitly.
- `npm run build:desktop:linux` builds Linux `deb` and `appimage`.
- `npm run build:desktop:mac` builds macOS `app` and `dmg`.
- Set `YANSILU_DESKTOP_BUNDLES=...` to override bundle targets in CI or local runs.

## Tests
- `npm test` runs unit, integration, and smoke e2e tests.
- `npm run test:e2e:smoke` starts temporary API/Web services and verifies the prototype can load against a real API.
- `npm run test:e2e:browser:mvp` runs a smaller real-browser MVP flow covering note edit/save, vault switch, import/export, writing, graph, and note move/delete.
- `npm run test:e2e:browser -- --list` shows the available browser e2e groups.
- `npm run test:e2e:browser -- mobile-responsive` runs the mobile responsive browser checks, including the permanent-note capture flow.
- `npm run test:e2e:mobile:permanent-note` runs only the mobile permanent-note capture regression and saves screenshots to a temporary artifact directory.
- `npm run test:e2e:browser` runs the grouped real-browser prototype flow when Playwright and Chromium are installed.
- `npm run mvp:check` runs the core MVP validation path: tests, smoke e2e, quick real-browser MVP e2e, desktop dev preflight, and desktop bundle preflight.
- Browser e2e runners in `package.json` and `scripts/` already set `RUN_BROWSER_E2E=1` for you. Only direct `node --test` invocations against `tests/e2e/prototype-browser.test.mjs` still need it manually.

MVP API areas:
- Health and vault switching: `/health`, `/api/v1/vault`
- Directories and notes: `/api/v1/directories`, `/api/v1/notes`
- Tags, relations, and graph: `/api/v1/tags`, `/api/v1/graph`
- Assets: `/api/v1/assets`
- Import/export: `/api/v1/imports`, `/api/v1/exports/markdown`
- Originality and writing: `/api/v1/originality/check`, `/api/v1/writing-projects`, `/api/v1/draft-scaffolds`

Key docs:
- `docs/MVP_ALIGNMENT_2026-05-09.md`
- `docs/MVP_RUNTIME_CHECKLIST.md`
- `docs/PRODUCT_SPEC.md`
- `docs/SYSTEM_ARCHITECTURE.md`
- `docs/DOMAIN_MODEL_AND_SCHEMAS.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/API.md`
- `docs/ACCEPTANCE_TESTS.md`

## Git Worktree (Recommended)
- Keep worktrees outside the repo root, for example: `E:\Projects\yansilu-wt\`
- Each worktree gets isolated ports and vault path via `.env.worktree`

Create a worktree:
- `npm run wt:create -- -Name fleeting-note -Kind feat -Base main`

List worktrees:
- `npm run wt:list`

Run dev with that worktree env:
- `npm run wt:run -- -Target all`
- or `npm run wt:run -- -Target api`

Prepare worktree dependencies by linking the primary checkout `node_modules`:
- `npm run wt:deps`

Remove a worktree:
- `npm run wt:remove -- -Target feat-fleeting-note -Prune`

Direct script usage (PowerShell):
- `./scripts/worktree-create.ps1 -Name graph-perf -Kind feat`
- `./scripts/worktree-create.ps1 -Name ai-inbox -Kind feat -Theme "AI inbox / suggestions / adoption" -Lifecycle long-lived`
- `./scripts/worktree-list.ps1`
- `./scripts/worktree-run-dev.ps1 -Target all`
- `./scripts/worktree-remove.ps1 -Target feat-graph-perf -Prune`

`worktree-create.ps1` now also:
- prefers `origin/<base>` when available, so new worktrees start closer to the latest remote baseline
- writes a local `WORKTREE.md` manifest with theme, lifecycle, sync rules, and suggested checks
- supports `-Theme` and `-Lifecycle` to make scope explicit at creation time

Long-lived stream worktrees:
- use them only as temporary mother lines for one stream
- merge clean `feat/*-batch` branches, not the whole mother line
- see `docs/WORKTREE_WORKFLOW_2026-05-20.md` for the long-lived worktree SOP

If browser e2e is required in a worktree:
- run `npm run wt:deps` first when the worktree does not have its own `node_modules`
- then run `npx.cmd playwright --version` to confirm Playwright resolves from the linked dependency tree
- Chromium still uses the normal Playwright browser cache on the machine
