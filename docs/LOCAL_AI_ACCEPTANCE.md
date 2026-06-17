# Local AI Acceptance

This document defines the first MVP bar for local models. Local AI is not expected to replace strong remote models. It must prove that it can reliably handle frequent, private, low-cost note tasks.

## Goals

- Keep eligible private note work on the user's machine.
- Reduce cost for frequent lightweight AI actions.
- Keep basic intelligence usable when cloud models are unavailable.
- Provide a measurable basis for choosing local small models.

## MVP Task Bar

A local model is acceptable for the first local AI layer when it can pass at least 3 of these 4 checks:

1. Short note summary returns a useful JSON summary and key points.
2. Tag suggestions return 3 to 5 concise tags.
3. Relation candidate detection returns a structured link decision and rationale.
4. Structured action decision returns valid JSON with action, confidence, and evidence.

Run:

```powershell
npm.cmd run eval:ai:ollama
```

Optional environment variables:

```powershell
$env:OLLAMA_BASE_URL='http://127.0.0.1:11434'
$env:OLLAMA_MODEL='qwen3:8b'
$env:OLLAMA_EVAL_MIN_PASS='3'
npm.cmd run eval:ai:ollama
```

## Recommended Starting Models

- `qwen3:8b`: current default local reasoning model for viewpoint distillation, potential relation judgment, and structured AI suggestions. Re-run the eval bar on target machines before release.
- `qwen2.5:7b`: lightweight option for faster, lower-resource local tasks; previously passed the MVP bar on this machine.
- `qwen3.5:9b`: high-quality option for deeper analysis when the user accepts slower local runs.
- `qwen2.5:3b`: lower-resource fallback only; it did not meet the MVP eval bar in the current check.
- `llama3.1:8b`: solid general fallback.
- `phi3.5:latest` or `gemma2:2b`: very small baseline for fast checks.

## Product Routing

- Local first: relation scans, tags, short summaries, lightweight classification, and privacy-only work.
- Cloud preferred: deep reflection, writing bridge, long-context synthesis, and final draft quality work.
- Hybrid mode must expose which provider/model was used in the run log.
- Potential relations use a two-stage path: local rules/keywords/graph signals first, then `qwen3:8b` for candidate review in 3-5 item batches.
- Viewpoint distillation asks for candidate viewpoints only: core viewpoint, evidence anchors, uncertainties, counter-questions, and a permanent-note draft.
- AI suggestions and relation outputs stay review-only. Malformed local-model JSON must fall back to rule candidates without writing note fields or graph edges.

## Review Gate Fixed Tests

The local AI upgrade must keep these checks green:

- Provider/model defaults: `tests/unit/ai-model-pack-config-contract.test.mjs` and `tests/unit/ai-provider-config-contract.test.mjs`.
- Ollama missing-model guidance and bootstrap readiness: `tests/integration/api-vault-settings.test.mjs`.
- Potential relation should-link, same-topic rejection/uncertain state, batch size, and JSON failure fallback: `tests/unit/potential-relations.test.mjs` plus `tests/integration/api-potential-relations-refine.test.mjs`.
- Viewpoint distillation structured candidate output and malformed JSON fallback: `tests/unit/ai-note-analysis.test.mjs`.
- AI suggestion review-only queue behavior: `tests/integration/api-vault-settings.test.mjs` and canonical AI suggestion/inbox tests.
- Background relation scan batch/progress/retry metadata: `tests/unit/ai-scheduled-agent-tasks.test.mjs`.

## Current Local Runtime Check

Date: 2026-05-14

- `qwen2.5:3b` downloaded and smoke-tested successfully, but only passed 2 of 4 eval checks. It was removed after validation to keep local storage focused on a model that meets the bar.
- `qwen2.5:7b` downloaded and smoke-tested successfully.
- `npm.cmd run eval:ai:ollama` with `OLLAMA_MODEL=qwen2.5:7b` passed 3 of 4 checks, meeting the MVP bar.
- A direct `/api/generate` warm-start check returned `ready`; `/api/ps` showed `qwen2.5:7b` loaded with a 10-minute keep-alive.

Current recommended default local model:

- `qwen3:8b`

Historical lightweight validation:

- `qwen2.5:7b`

Validation commands:

```powershell
$env:OLLAMA_MODEL='qwen3:8b'
npm.cmd run smoke:ai:ollama
npm.cmd run eval:ai:ollama
```

## Current Limitation

The evaluation script calls Ollama's OpenAI-compatible endpoint directly. It validates local capability, not final UX quality. Human review is still required before enabling a model as the default recommendation.
