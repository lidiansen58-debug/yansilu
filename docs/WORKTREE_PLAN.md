# Worktree Development Plan v2

## Goal

This plan replaces the earlier capability-building split with a narrower delivery split for the first desktop-runnable Yansilu MVP.

The current project is no longer at the "build the core model from scratch" stage. The API, local vault, import preview/confirm flow, originality guard, graph, writing scaffold, and web prototype are already in place. The remaining work is to stabilize the baseline, validate the desktop shell on a real machine, harden the import path, polish the main user journey, and decide whether the build is ready to ship as a first internal version.

The target for this phase is:

`npm run dev:desktop` can launch, the main walkthrough can complete end to end, and a desktop installer can be produced.

## Current Reality

As of this plan:

1. The repository default branch is `master`, not `main`.
2. `scripts/worktree-create.ps1` defaults to `Base = "main"` and must be aligned before bulk worktree creation.
3. The desktop preflight already detects working Rust and Tauri tooling on this machine.
4. The current baseline is not fully green yet:
   - `npm test` currently reports `88 pass / 2 fail / 45 skipped`
   - the active failures are in:
     - `tests/integration/api-notes.test.mjs`
     - `tests/unit/web-import-toolbar-panel.test.mjs`
5. `npm run dev:desktop:check` currently fails only because the web and API dev servers are not already running on `:5173` and `:3000`; it does not indicate a missing Rust toolchain.

This means the first step is not "open many worktrees". The first step is "freeze a stable baseline".

## Delivery Standard

Call the first desktop-runnable MVP ready only when all of the following are true:

1. `npm test` is green.
2. `npm run dev:desktop` launches successfully on a real machine.
3. The full walkthrough succeeds:
   - create directory
   - create note
   - edit and save note
   - insert a `[[wikilink]]`
   - click a `#tag`
   - import Markdown or Obsidian content
   - open graph view
   - create writing project and draft scaffold
4. `npm run build:desktop` produces a usable desktop bundle.
5. There are no open P0 defects.

## Recommended Shape

Use one coordination tree plus four focused worktrees.

| Workspace | Role | Ownership |
|---|---|---|
| `integration-main` | Shared baseline and merge point | Branch hygiene, failing tests, docs, merge coordination, release decision |
| `wt-desktop-runtime` | Desktop shell validation | Tauri runtime, desktop file dialogs, opener flows, build scripts, packaging |
| `wt-import-hardening` | Import and rollback stability | Markdown/Obsidian fixtures, import preview/confirm/rollback correctness, import UX messages |
| `wt-shell-polish` | Demo-ready shell and workflow UX | Explorer/editor/graph/writing shell polish, empty states, error states, main-path usability |
| `wt-release-qa` | Verification and release readiness | E2E coverage, smoke checklist, walkthrough validation, known-issues log |

`integration-main` can stay on the primary repository checkout. The other four should be separate worktrees.

## Ownership Boundaries

### `integration-main`

Scope:

- fix baseline blockers before branching
- align branch/worktree tooling
- keep docs authoritative
- merge validated slices from feature worktrees
- decide go/no-go for the first release candidate

Out of scope:

- feature accumulation
- large UI polish work
- connector feature expansion

Primary files:

- `scripts/worktree-create.ps1`
- `docs/WORKTREE_PLAN.md`
- `docs/MVP_RUNTIME_CHECKLIST.md`
- failing test files
- release notes and decision docs

### `wt-desktop-runtime`

Scope:

- launch `npm run dev:desktop`
- validate Tauri dialog flows
- validate opener/reveal flows
- validate Vault switching in desktop mode
- validate Chinese and spaced Windows paths
- run desktop preflight and bundle preflight
- produce NSIS build

Out of scope:

- import business rules
- shell-wide visual polish unrelated to desktop APIs
- graph or writing feature changes

Primary files:

- `apps/desktop/**`
- `scripts/dev-desktop.mjs`
- `scripts/build-desktop.mjs`
- `scripts/desktop-preflight.mjs`
- `scripts/desktop-bundle-preflight.mjs`
- `scripts/rust-env.mjs`
- `apps/web/src/desktop-*`
- `apps/web/src/path-picker-adapter.js`
- `apps/web/src/desktop-file-command-service.js`

Acceptance:

1. `npm run dev:desktop` starts successfully.
2. Desktop dialog can choose:
   - new directory path
   - directory save path
   - Vault path
3. Desktop opener can reveal:
   - current Markdown file
   - selected directory
4. `npm run build:desktop` produces an installer.

### `wt-import-hardening`

Scope:

- expand real-world Markdown and Obsidian fixtures
- stabilize preview -> confirm -> rollback
- verify skipped/warning/blocked/excluded behavior
- improve import result clarity where needed

Out of scope:

- Tauri integration
- broad shell redesign
- writing or graph features outside import handoff behavior

Primary files:

- `packages/connectors/**`
- `packages/markdown-engine/**`
- `apps/web/src/import-*`
- `tests/fixtures/imports/**`
- import-related integration and unit tests

Acceptance:

1. Repeated preview/confirm/rollback runs remain stable.
2. Large fixture imports produce warnings instead of crashes.
3. Candidate-level skip reasons stay traceable and user-readable.
4. Import confirm still hands off cleanly into note review or writing workflows.

### `wt-shell-polish`

Scope:

- reduce demo friction in the main app shell
- improve empty states, action labels, and workflow continuity
- make the explorer/editor/graph/writing path feel intentional
- keep prototype UI from reading like a debug console

Out of scope:

- import business logic changes
- desktop build scripts
- contract/schema changes unless coordinated through `integration-main`

Primary files:

- `apps/web/src/prototype-*`
- `apps/web/src/components-*`
- shared shell and workspace UI files

Acceptance:

1. Note-first workflow is clear on first launch.
2. Import, graph, and writing areas feel like product workspaces, not separate tools glued together.
3. Error states and zero states are understandable without developer context.
4. The main walkthrough can be demoed without explaining internal implementation details.

### `wt-release-qa`

Scope:

- keep the MVP runtime checklist current
- add or repair browser E2E and smoke coverage
- track known issues
- run full walkthroughs against merged slices
- produce a release readiness conclusion

Out of scope:

- feature ownership of import, shell, or desktop runtime
- silent business-rule changes

Primary files:

- `tests/e2e/**`
- `docs/MVP_RUNTIME_CHECKLIST.md`
- `docs/API.md`
- release notes and known-issues docs

Acceptance:

1. The minimum regression path is documented and repeatable.
2. Browser smoke/E2E reflects the actual MVP path.
3. The final release decision is based on a real walkthrough, not just unit tests.

## File Collision Rules

To keep merges sane:

1. `wt-desktop-runtime` owns `apps/desktop/**` and desktop-only bridge code.
2. `wt-import-hardening` owns `apps/web/src/import-*` and import packages.
3. `wt-shell-polish` should avoid `apps/web/src/import-*` unless explicitly coordinated.
4. `wt-release-qa` should prefer `tests/**` and `docs/**`.
5. Schema, contract, and cross-cutting API changes must be surfaced through `integration-main` before merge.

## Sequence

### Phase 0: Freeze baseline

Do this before creating the four feature worktrees:

1. Align `scripts/worktree-create.ps1` with the actual base branch:
   - either change default `Base` from `main` to `master`
   - or rename the main branch to `main`
2. Fix the current two failing tests.
3. Run:
   - `npm test`
   - `npm run dev:desktop:check`
4. Create a baseline commit and tag, for example:
   - `mvp-baseline-2026-05-04`

### Phase 1: Critical path

Start `wt-desktop-runtime` first.

Reason:

- it is the only stream directly on the path to "desktop-runnable MVP"
- it validates whether the remaining work is mostly packaging and UX, or still blocked by platform integration

### Phase 2: Parallel hardening

Once the baseline is stable:

1. run `wt-desktop-runtime`
2. run `wt-import-hardening`
3. run `wt-shell-polish`
4. keep `wt-release-qa` validating slices as they merge

### Phase 3: Converge and decide

1. merge the desktop-runtime slices first
2. merge import and shell slices in small pieces
3. run a full walkthrough after each meaningful merge
4. freeze scope and move only bug fixes in the last two days

## One-Week Execution Plan

### Day 0

Baseline freeze:

1. fix branch/worktree base mismatch
2. fix the two failing tests
3. tag the baseline
4. create worktrees from the frozen base

Exit:

- worktree creation is safe
- tests are green

### Day 1

Desktop/runtime first pass:

1. launch `npm run dev:desktop`
2. record startup blockers
3. verify:
   - choose directory
   - reveal file
   - open folder
   - switch Vault

Parallel:

- QA prepares a checklist-based walkthrough sheet

Exit:

- desktop shell can at least start

### Day 2

Parallel streams:

1. `wt-desktop-runtime`
   - validate Windows path behavior
   - repair desktop-specific error messaging
2. `wt-import-hardening`
   - add larger real-world fixtures
   - stabilize import edge cases
3. `wt-shell-polish`
   - clean first-run and workspace-level friction

Exit:

- desktop APIs behave on a real machine
- import fixtures cover realistic inputs

### Day 3

1. run `npm run build:desktop:check`
2. harden rollback and conflict handling
3. close obvious demo UX gaps
4. QA fills coverage holes in browser smoke/E2E

Exit:

- no major desktop preflight blockers

### Day 4

1. produce the first NSIS build
2. run the first full human walkthrough
3. collect defects by severity

Exit:

- there is a real installer
- there is a real walkthrough report

### Day 5

Scope freeze for features.

Only allow:

1. P0 bug fixes
2. demo-blocking P1 fixes
3. release-note and checklist updates

Exit:

- no new feature work enters the branch

### Day 6

1. rerun full regression
2. rerun desktop walkthrough
3. confirm installer still builds

Exit:

- main path is stable twice in a row

### Day 7

Release decision:

1. verify all delivery-standard items
2. write known issues
3. make go/no-go call

## Minimum Daily Regression

Run this after each meaningful merge:

1. create directory
2. create note
3. edit and save note
4. insert `[[wikilink]]`
5. click `#tag`
6. import Markdown or Obsidian content
7. open graph
8. create writing project and scaffold

## Worktree Creation Commands

Use the frozen baseline branch explicitly. With the current repository state that means `-Base master` unless the primary branch is renamed first.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\worktree-create.ps1 -Name desktop-runtime -Kind feat -Base master
powershell -ExecutionPolicy Bypass -File .\scripts\worktree-create.ps1 -Name import-hardening -Kind feat -Base master
powershell -ExecutionPolicy Bypass -File .\scripts\worktree-create.ps1 -Name shell-polish -Kind feat -Base master
powershell -ExecutionPolicy Bypass -File .\scripts\worktree-create.ps1 -Name release-qa -Kind feat -Base master
```

If the main branch is renamed to `main`, update the commands and the script default together.

## Immediate Next Actions

Do these next, in order:

1. Fix `scripts/worktree-create.ps1` base-branch mismatch.
2. Fix the two currently failing tests.
3. Re-run `npm test`.
4. Create the baseline commit/tag.
5. Create the four worktrees.
6. Start `wt-desktop-runtime` first.

