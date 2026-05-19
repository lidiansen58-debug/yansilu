# PR Description

## Summary

This PR establishes a canonical contract layer for the AI workstream and wires it through three layers of the product:

1. shared schemas and docs
2. runtime adapters and API responses
3. frontend consumption in settings-facing AI surfaces

It covers the main AI object families:

- AI inbox artifacts
- AI inbox list items
- AI suggestions
- AI adoption events
- AI scheduled tasks

## What Changed

### Shared contracts

- Added canonical JSON schemas for artifact, inbox item, suggestion, adoption event, and scheduled task objects
- Added workstream handoff, backlog, shared model, and change summary docs

### Runtime and API

- Added one-way runtime-to-canonical adapters in `packages/ai-orchestrator/src/canonical-models.mjs`
- Exported the adapters through the AI orchestrator package
- Added `?canonical=true` API support for:
  - AI inbox
  - AI scheduled tasks
  - AI suggestions

### Web

- Added canonical hydration on the web side for inbox, scheduled tasks, and suggestions
- Added a settings debug surface for runtime vs canonical payload snapshots
- Added a minimal settings review surface for AI suggestions

## Why

Before this change, AI payloads were mostly runtime-only shapes and frontend consumers were tightly coupled to local response formats.

This change creates one stable contract for AI review objects while keeping compatibility by making canonical responses opt-in.

## Verification

Covered by:

- canonical adapter unit tests
- shared schema unit tests
- canonical API integration tests
- web model, panel, and prototype API unit tests
- `node --check apps/web/src/prototype-app.js`

## Commit Structure

1. `docs: define shared AI workstream contracts`
2. `feat(ai): add canonical adapters and API responses`
3. `feat(web): consume canonical AI payloads in settings surfaces`
