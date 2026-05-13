# Provider Config Contract V1

> Status: draft implementation contract
> Date: 2026-05-11
> Workstream: `feat/ai-agent-layer`
> Related: `PROVIDER_ADAPTER_INTERFACE_V1.md`, `MODEL_PACK_CONFIG_CONTRACT_V1.md`, `PROVIDER_HEALTH_CHECK_RUNNER_V1.md`, `PROVIDER_HEALTH_AND_FALLBACK_POLICY_V1.md`, `MODEL_PROVIDER_CAPABILITY_MATRIX.md`, `AI_AGENT_LAYER_STORAGE_SCHEMA_V1.md`

## 1. Purpose

Provider config is the boundary between model policy and real provider execution.

Model packs decide intent. Provider presets describe provider capability. Provider config stores the workspace or user-specific execution details needed to call a real endpoint.

This contract keeps the product flexible across OpenAI direct, OpenRouter-like gateways, LiteLLM-like gateways, China-region providers, enterprise gateways, and local/private runtimes.

Executable schema and validation binding:

- `schemas/ai_provider_config.schema.json`
- `packages/ai-orchestrator/src/ai-provider-configs.mjs`
- `tests/unit/ai-provider-config-contract.test.mjs`

## 2. Config Shape

```json
{
  "id": "provider_openai_compatible_gateway",
  "provider_id": "openai_compatible_gateway",
  "display_name": "OpenAI-Compatible Gateway",
  "adapter_type": "aggregated_gateway",
  "status": "enabled",
  "auth_mode": "workspace_managed",
  "secret_ref": "secret_gateway",
  "endpoint_url": "https://gateway.example.test/v1/chat/completions",
  "headers": {
    "x-workspace-id": "workspace_01"
  },
  "capabilities": {},
  "model_map": {
    "standard": "openai_compatible_gateway:standard"
  },
  "runtime_model_map": {
    "openai_compatible_gateway:standard": "gateway-standard-model"
  },
  "health_check": {
    "enabled": true,
    "endpoint_url": "https://gateway.example.test/health",
    "method": "GET",
    "timeout_ms": 2000,
    "expected_status": 200,
    "interval_seconds": 60
  },
  "created_at": "iso_datetime",
  "updated_at": "iso_datetime"
}
```

## 3. Secret Rules

- Store `secret_ref`, never raw provider keys.
- Reject config fields such as `apiKey`, `api_key`, `secret`, `secretValue`, `rawSecret`, or `token`.
- Reject auth headers such as `authorization`, `x-api-key`, or `api-key` inside stored headers.
- `workspace_managed`, `byok_advanced`, and `enterprise_secret` require `secret_ref`.
- `platform_managed` may omit `secret_ref` because the platform can resolve credentials internally.
- `local_no_key` should not reference cloud secrets.
- Run Logs should record `secret_ref` at most, never secret values.

## 4. Endpoint Rules

- Enabled `aggregated_gateway`, `self_hosted_gateway`, and `local_gateway` configs require `endpoint_url`.
- Cloud and remote gateway endpoints must use HTTPS.
- `local_gateway` may use local HTTP endpoints such as `http://localhost:11434`.
- Direct provider configs may omit `endpoint_url` if the adapter has a built-in endpoint.
- Endpoint config belongs to provider config, not agent definitions.

## 5. Health Check Rules

Health checks should be configured as data, not provider-specific code.

Allowed fields:

- `enabled`
- `endpoint_url`
- `method`
- `timeout_ms`
- `expected_status`
- `interval_seconds`

Rules:

- Health check endpoint must be HTTP or HTTPS.
- Enabled health checks require `endpoint_url`.
- Health check execution is defined in `PROVIDER_HEALTH_CHECK_RUNNER_V1.md`.
- Health check status should influence fallback and scheduled task execution.
- Health-aware fallback rules are defined in `PROVIDER_HEALTH_AND_FALLBACK_POLICY_V1.md`.
- Health check results belong in run logs or provider health history, not in model pack definitions.

## 6. Example Provider Configs

### 6.1 Aggregated Gateway

```json
{
  "provider_id": "openai_compatible_gateway",
  "adapter_type": "aggregated_gateway",
  "auth_mode": "workspace_managed",
  "secret_ref": "secret_gateway",
  "endpoint_url": "https://gateway.example.test/v1/chat/completions"
}
```

Use for OpenRouter-like or LiteLLM-like gateway access.

### 6.2 China Optimized Gateway

```json
{
  "provider_id": "china_optimized_gateway",
  "adapter_type": "aggregated_gateway",
  "auth_mode": "workspace_managed",
  "secret_ref": "secret_china_gateway",
  "endpoint_url": "https://china-gateway.example.test/v1/chat/completions"
}
```

Use when domestic or China-region-friendly providers sit behind one product-controlled policy boundary.

### 6.3 Local Private Gateway

```json
{
  "provider_id": "local_private_gateway",
  "adapter_type": "local_gateway",
  "auth_mode": "local_no_key",
  "endpoint_url": "http://localhost:11434/v1/chat/completions",
  "health_check": {
    "enabled": true,
    "endpoint_url": "http://localhost:11434/api/tags",
    "method": "GET",
    "timeout_ms": 1000,
    "expected_status": 200,
    "interval_seconds": 30
  }
}
```

Use for Ollama, LM Studio, vLLM local endpoints, or enterprise private runtimes exposed through a compatible local gateway.

### 6.4 MiniCPM Local Gateway

```json
{
  "provider_id": "minicpm_local_gateway",
  "adapter_type": "local_gateway",
  "auth_mode": "local_no_key",
  "endpoint_url": "http://localhost:11434/v1/chat/completions",
  "runtime_model_map": {
    "minicpm_local_gateway:local_private": "minicpm"
  },
  "health_check": {
    "enabled": true,
    "endpoint_url": "http://localhost:11434/api/tags",
    "method": "GET",
    "timeout_ms": 1000,
    "expected_status": 200,
    "interval_seconds": 30
  }
}
```

Use for a local MiniCPM-compatible model exposed through an OpenAI-compatible desktop or local server. The concrete runtime model id should be overridden in `runtime_model_map` when the local runtime uses a different model name.

### 6.5 MiniCPM Remote Gateway

```json
{
  "provider_id": "minicpm_remote_gateway",
  "adapter_type": "aggregated_gateway",
  "auth_mode": "workspace_managed",
  "secret_ref": "secret_minicpm_gateway",
  "endpoint_url": "https://minicpm-gateway.example.test/v1/chat/completions",
  "runtime_model_map": {
    "minicpm_remote_gateway:standard": "minicpm"
  }
}
```

Use for a remote third-party MiniCPM-compatible provider when local runtime setup is not available. This path is not `local_only`; privacy-sensitive runs should stay on `minicpm_local_gateway` or another local/private provider.

## 7. Ownership Boundary

Provider config owns:

- Endpoint URL.
- Secret reference.
- Non-secret headers.
- Health check settings.
- Provider-specific model map overrides.
- Runtime model id aliases for the selected provider or gateway.
- Workspace or user-specific provider status.

Provider config must not own:

- Task routing.
- Privacy decisions.
- Budget policy.
- User-facing model mode labels.
- Originality/provenance rules.
- Raw secret values.

## 8. MVP Decision

MVP should support these provider config paths:

- `platform_managed_openai`: default direct baseline, no novice setup.
- `openai_compatible_gateway`: OpenRouter-like or LiteLLM-like adapter path.
- `china_optimized_gateway`: China-friendly gateway or direct provider pack path.
- `local_private_gateway`: local/private endpoint path, disabled until configured.
- `minicpm_local_gateway`: named local MiniCPM endpoint path.
- `minicpm_remote_gateway`: third-party remote MiniCPM-compatible endpoint path.

The UI can hide this from novice users. Advanced users and workspace admins can configure it after the core note-taking experience is stable.

## 9. Runtime Model Map

`model_map` and `runtime_model_map` deliberately solve different problems.

- `model_map` maps product tiers such as `standard` or `strong_reasoning` to internal logical model refs.
- `runtime_model_map` maps those logical refs to the concrete model ids a runtime or gateway should call.
- Keys in `runtime_model_map` must reference values from `model_map`, not user-facing tier names.
- Novice settings should never require raw model ids. The product compiles simple modes into logical refs first, then the provider config resolves the runtime model id.

Example:

```json
{
  "model_map": {
    "standard": "openai_compatible_gateway:standard"
  },
  "runtime_model_map": {
    "openai_compatible_gateway:standard": "gateway-standard-model"
  }
}
```
