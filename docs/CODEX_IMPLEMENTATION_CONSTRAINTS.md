# Codex Implementation Constraints

This note records the standing constraints for future Codex threads and worktrees. The goal is to keep Yansilu feature work fast without letting central files absorb every new behavior.

## Core Rule

Do not treat "feature completed" as the only success criterion. A feature is only complete when it is placed in the right product and code boundary, with focused tests.

## Entry Files Stay Thin

Do not put major business logic directly into large entry files, especially:

- `apps/web/src/prototype-app.js`
- `apps/web/src/prototype.html`
- `apps/api/src/server.mjs`

These files should mostly handle wiring, state composition, event forwarding, and entry registration. If a task must modify one of them, explain why and keep the change at the wiring layer.

## Product Boundaries

Before implementation, classify the task into one or more product boundaries:

- `note/editor`: note editing, saving, selection, link insertion
- `graph`: graph view, isolated notes, potential relations, relation confirmation
- `ai-settings`: model config, Ollama, local/cloud model selection
- `update`: version checks, auto update, release feeds
- `writing`: writing center, material organization, draft assistance
- `system-messages`: system messages, inbox items, AI suggestion reminders

If a feature crosses boundaries, split it through an adapter, controller, or flow module. Do not let `prototype-app.js` directly orchestrate several internals from different boundaries.

## Default Module Placement

Use these defaults when adding or moving logic:

- State calculation: `*-state.js` or `*-model.js`
- API calls: `prototype-api.js` or a dedicated adapter
- Complex interaction flow: `*-flow.js` or `*-controller.js`
- Graph behavior: `graph-*`
- AI settings behavior: `ai-settings-*`
- Update behavior: `update-*`
- Writing behavior: `writing-*`

Avoid placing large blocks of business logic, rendering logic, state machines, or side effects in `prototype-app.js`.

## Required Pre-Implementation Check

Before coding, answer briefly:

1. Which product boundary owns this feature?
2. Which existing modules should be reused?
3. Which new modules should be created?
4. Does `prototype-app.js` need to change? If yes, which wiring points only?
5. Which tests prove the behavior did not regress?

## Complexity Red Lines

Pause and propose a split plan before continuing if:

- A single file would gain more than 150 lines.
- `prototype-app.js`, `prototype.html`, or `server.mjs` would gain more than 80 lines.
- A single commit mixes multiple product boundaries without a clear adapter layer.

Continue past these limits only after explicit approval.

## Implementation Rhythm

Prefer small, reviewable steps:

1. Add or reuse a focused module.
2. Add unit coverage for the focused module.
3. Wire the module into the entry file.
4. Add integration or browser coverage where behavior crosses UI/API boundaries.
5. Clean unrelated runtime files and generated noise before committing.

Do not combine unrelated product surfaces in one commit merely because they are nearby in the UI.

## Prompt Snippet For Future Threads

Append this to future feature prompts:

```text
Before implementation, check whether this task would expand prototype-app.js, prototype.html, or server.mjs. If yes, propose a modularization plan first. By default, entry files should only perform wiring; new business logic must live in focused modules with tests.
```
