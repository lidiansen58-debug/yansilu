# Provider Health Check Runner V1

> Status: draft implementation contract
> Date: 2026-05-11
> Workstream: `feat/ai-agent-layer`
> Related: `PROVIDER_CONFIG_CONTRACT_V1.md`, `PROVIDER_HEALTH_STORE_V1.md`, `PROVIDER_HEALTH_AND_FALLBACK_POLICY_V1.md`, `SCHEDULED_AGENT_TASKS_V1.md`

## 1. Purpose

Provider Health Check Runner executes the `health_check` settings from Provider Config and writes the result into Provider Health Store.

This closes the runtime loop:

```text
Provider Config
  -> Health Check Runner
  -> Provider Health Store
  -> Provider Health Policy
  -> Model Routing / Scheduled Tasks / Run Log
```

Executable implementation and tests:

- `packages/ai-orchestrator/src/provider-health-runner.mjs`
- `tests/unit/ai-provider-health-runner.test.mjs`

## 2. Safety Defaults

Health checks must not accidentally call external services.

Rules:

- Runner should not execute network requests unless `networkEnabled: true` or an explicit `fetchImpl` is provided.
- If network is disabled, record `unknown` with `error_type: network_disabled`.
- Disabled health checks record `unknown` with `error_type: health_check_disabled`.
- Health check requests must not include raw API keys.
- Health check requests may include non-secret headers from Provider Config.

## 3. Request Shape

```json
{
  "provider_id": "openai_compatible_gateway",
  "provider_config_id": "provider_openai_compatible_gateway",
  "url": "https://gateway.example.test/health",
  "method": "GET",
  "headers": {
    "x-workspace-id": "workspace_01"
  },
  "expected_status": 204,
  "timeout_ms": 1000
}
```

The runner builds this from `Provider Config.healthCheck`.

## 4. Result Mapping

| Result | Stored Status | Notes |
| --- | --- | --- |
| HTTP status equals `expected_status` | `healthy` | Provider can be used normally |
| HTTP 4xx except auth-specific handling | `degraded` | Provider reachable but not healthy for this config |
| HTTP 408, 429, or 5xx | `down` | Retryable or unavailable provider path |
| Timeout | `down` | Retryable |
| Network disabled | `unknown` | Safe default for local tests/offline mode |
| Health check disabled | `unknown` | Config exists but should not be probed |

## 5. Store Write

The runner writes a Provider Health Store record:

```json
{
  "provider_id": "openai_compatible_gateway",
  "provider_config_id": "provider_openai_compatible_gateway",
  "status": "healthy",
  "latency_ms": 320,
  "checked_at": "iso_datetime",
  "source": "health_check",
  "trigger": "scheduled_task",
  "message": "Provider health check succeeded.",
  "error_type": "",
  "retryable": false,
  "payload": {
    "endpoint_url": "https://gateway.example.test/health",
    "method": "GET",
    "expected_status": 204,
    "actual_status": 204
  }
}
```

Payload must stay safe and non-secret.

## 6. Batch Runner

Batch health checks should run over configured providers:

```text
runProviderHealthChecks({ providerConfigs, providerHealthStore, fetchImpl })
```

Output summary:

```json
{
  "total": 2,
  "healthy": 1,
  "degraded": 0,
  "down": 1,
  "unknown": 0
}
```

## 7. Scheduled Task Usage

Scheduled tasks should call the runner before executing AI work when:

- The configured provider has no recent health record.
- The latest health record is older than the provider config interval.
- The last result was `down` or `degraded`.
- A background digest or research scan is about to spend budget.

If health remains `down` and no allowed fallback exists, the scheduled task should skip and log a reviewable reason.

## 8. MVP Decision

MVP should include:

- Single-provider health check execution.
- Batch health check execution.
- Safe network-disabled behavior for tests and offline mode.
- Health Store writes for every executed, skipped, or failed health check.
- No raw secrets in health check request config or stored payload.

MVP can defer:

- Cron-like health polling.
- Provider-specific status page integrations.
- Adaptive health intervals.
- Admin UI for health history.
