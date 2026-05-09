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
- `npm run test:e2e:browser` runs the real browser prototype flow when Playwright and Chromium are installed.
- `npm run mvp:check` runs the core MVP validation path: tests, smoke e2e, desktop dev preflight, and desktop bundle preflight.
- Set `RUN_BROWSER_E2E=1` to enable browser e2e execution; without it, browser tests are skipped by design.

MVP API routes:
- `GET /health`
- `POST /api/v1/imports/preview`
- `POST /api/v1/imports/:id/confirm`

Key docs:
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
- `npm run wt:create -- -Name fleeting-note -Kind feat -Base master`

List worktrees:
- `npm run wt:list`

Run dev with that worktree env:
- `npm run wt:run -- -Target all`
- or `npm run wt:run -- -Target api`

Remove a worktree:
- `npm run wt:remove -- -Target feat-fleeting-note -Prune`

Direct script usage (PowerShell):
- `./scripts/worktree-create.ps1 -Name graph-perf -Kind feat`
- `./scripts/worktree-list.ps1`
- `./scripts/worktree-run-dev.ps1 -Target all`
- `./scripts/worktree-remove.ps1 -Target feat-graph-perf -Prune`
