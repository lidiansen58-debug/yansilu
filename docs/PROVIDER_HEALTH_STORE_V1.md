# Provider Health Store V1

> Status: draft implementation contract
> Date: 2026-05-11
> Workstream: `feat/ai-agent-layer`
> Related: `PROVIDER_HEALTH_CHECK_RUNNER_V1.md`, `PROVIDER_HEALTH_AND_FALLBACK_POLICY_V1.md`, `PROVIDER_CONFIG_CONTRACT_V1.md`, `AI_AGENT_LAYER_STORAGE_SCHEMA_V1.md`

## 1. Purpose

Provider Health Store persists health check results so model routing, scheduled tasks, fallback policy, and diagnostics can make decisions from recent provider state instead of guessing.

It records operational health only. It must not store prompts, note content, model outputs, or raw provider secrets.

Executable implementation and tests:

- `packages/ai-orchestrator/src/provider-health-store.mjs`
- `packages/ai-orchestrator/src/sqlite-provider-health-store.mjs`
- `packages/ai-orchestrator/src/provider-health-runner.mjs`
- `tests/unit/ai-provider-health-store.test.mjs`

## 2. Store Interface

Minimum interface:

```text
recordProviderHealth(input)
getLatestProviderHealth({ providerId })
listProviderHealth({ providerId, status, source, limit })
listLatestProviderHealth({ status, limit })
deleteProviderHealth({ id })
```

The same interface should exist for memory and SQLite stores.

## 3. Health Record Shape

```json
{
  "id": "health_gateway_01",
  "provider_id": "openai_compatible_gateway",
  "provider_config_id": "provider_openai_compatible_gateway",
  "status": "healthy",
  "latency_ms": 320,
  "checked_at": "iso_datetime",
  "source": "health_check",
  "trigger": "scheduled_task",
  "agent_run_id": "run_01",
  "message": "",
  "error_type": "",
  "retryable": false,
  "payload": {},
  "created_at": "iso_datetime"
}
```

Allowed `status` values:

- `healthy`
- `degraded`
- `down`
- `unknown`

Suggested `source` values:

- `health_check`
- `model_error`
- `manual_override`
- `provider_status_page`

## 4. SQLite Table

Table: `provider_health_checks`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text primary key | Health record id |
| `provider_id` | text | Provider preset/config id |
| `provider_config_id` | text nullable | Specific workspace/user config |
| `status` | text | healthy, degraded, down, unknown |
| `latency_ms` | integer | Measured or estimated latency |
| `checked_at` | datetime | When the signal was measured |
| `source` | text | health_check, model_error, manual_override, etc. |
| `trigger` | text nullable | user_command, scheduled_task, background_task |
| `agent_run_id` | text nullable | Optional run that produced the signal |
| `message` | text nullable | Safe diagnostic summary |
| `error_type` | text nullable | Normalized provider error type |
| `retryable` | integer | 0 or 1 |
| `payload_json` | json/text | Safe non-secret details |
| `created_at` | datetime | Store write time |

Suggested indexes:

- `provider_health_checks(provider_id, checked_at desc)`
- `provider_health_checks(status, checked_at desc)`
- `provider_health_checks(agent_run_id)`

## 5. Use In Routing

Provider Health Store feeds `PROVIDER_HEALTH_AND_FALLBACK_POLICY_V1.md`.

Flow:

```text
Provider Config
  -> health check runner records health result
  -> Provider Health Store returns latest status
  -> Provider Health Policy ranks candidates
  -> Run Log records selected provider and fallback result
```

Health Store should not decide routing by itself. It provides current state to Model Policy.

## 6. Scheduled Task Behavior

Scheduled tasks should query latest provider health before running:

- If primary is `healthy`, run normally.
- If primary is `degraded`, prefer an allowed healthy fallback.
- If primary is `down`, fallback if policy allows.
- If only fallback requires confirmation, skip and create a reviewable notice.
- If no health exists, treat as `unknown` and obey budget/privacy gates.

## 7. Privacy and Secret Rules

- Do not store raw API keys.
- Do not store auth headers.
- Do not store full prompts or note content in payloads.
- Messages must be safe to show in admin diagnostics.
- Local-only provider health can be stored without note content.

## 8. MVP Decision

MVP should persist:

- Latest provider health for each configured provider.
- Recent health history for debugging.
- Model-error-derived health records when provider calls fail.
- Scheduled-task skip reasons when health blocks execution.

Health history retention can be short at first because it is operational telemetry, not user knowledge.
