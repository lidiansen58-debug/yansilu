# wt-ai Handoff - 2026-05-18

This document defines the operating scope for the long-lived `wt-ai` worktree.

## Worktree

- Path: `E:\Projects\Thinking in Notes\wt-ai`
- Branch: `wt-ai`
- Base: `main` at creation time

## Scope

`wt-ai` owns the AI-specific product and engineering stream across four areas:

1. `AI inbox`
2. `suggestion / artifact / adoption`
3. `agent harness`
4. `scheduled tasks`

The goal is to keep AI work isolated from unrelated product-core or release work while still allowing long-lived iteration.

## Working Rules

- Prefer shipping AI capabilities here before merging slices back into `main`.
- Keep product docs, schemas, prompts, and harness utilities together when they belong to the same AI workflow.
- Avoid pulling unrelated editor, import/export, or desktop release changes into this branch unless they are direct prerequisites.
- When a task becomes independent and time-bounded, spin it out into a dedicated short-lived branch from `wt-ai` or from `main` as appropriate.

## Current Focus

### 1. AI inbox

Own the intake surface for AI-generated or AI-assisted work items:

- inbox item type definitions
- triage states
- provenance / source tracking
- review and dismissal flows

### 2. Suggestion / artifact / adoption

Own the lifecycle from AI output to user-accepted value:

- suggestion schemas
- artifact generation contracts
- adoption states such as accepted, edited, rejected, ignored
- instrumentation for whether AI output actually becomes part of user work

### 3. Agent harness

Own the runtime boundary for task-oriented agents:

- agent input/output contracts
- tool-safe execution boundaries
- evaluation fixtures
- replayable harness flows

### 4. Scheduled tasks

Own recurring or deferred AI work:

- scheduled suggestion runs
- inbox refresh jobs
- reminders / follow-up generation
- job history and failure visibility

## Non-Goals For This Worktree

- broad visual redesigns unrelated to AI workflows
- generic desktop packaging work
- import/export changes without an AI dependency
- large product-core refactors that do not unblock AI scope

## First Backlog

1. Define the canonical data model for AI inbox items, suggestions, artifacts, and adoption status.
2. Map the current codepaths that already touch AI-adjacent flows in `apps/`, `packages/`, `schemas/`, and `tests/`.
3. Decide whether `agent harness` should live primarily under `packages/` or `scripts/`, then standardize the location.
4. Add a minimal scheduled-task contract that can represent manual run, cron-like run, and retry state.
5. Create a thin acceptance checklist for end-to-end AI flow:
   `generation -> inbox -> review -> adopt/reject -> traceable outcome`

## Suggested Delivery Order

1. Contracts and schemas
2. Harness and evaluation path
3. Inbox UX/API wiring
4. Scheduled execution
5. Adoption analytics and polish

## Handoff Notes

- This branch is intended to stay alive for a while.
- Keep commits scoped by AI sub-area so cherry-picking stays easy.
- If a slice is stable and low-risk, merge it back independently rather than waiting for the whole stream to finish.

## Current Position After Mainline Recovery

As of 2026-05-19, the mainline AI code slices from this worktree have already been recovered into `main` in small reviewed batches.

That means:

- do not merge `wt-ai` back into `main` as a whole
- treat `wt-ai` as a long-lived AI workstream, handoff, and follow-up experiment line
- continue to recover only independent code slices from it when they are stable
- expect branch-only docs in this worktree to remain useful locally even when they are not promoted to `main`

In practice, `wt-ai` should now be handled like a stream branch:

1. keep AI notes, backlog docs, and handoff context here
2. develop new AI sub-slices here when isolation is useful
3. cherry-pick or otherwise recover only the code changes that are ready for `main`
