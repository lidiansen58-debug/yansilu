# Provider Adapter Interface V1

> Status: draft interface contract
> Date: 2026-05-09
> Workstream: `feat/ai-agent-layer`
> Related: `MODEL_NEUTRALITY_AND_PORTABILITY_PRINCIPLES.md`, `MODEL_PROVIDER_CAPABILITY_MATRIX.md`, `MODEL_ROUTING_POLICY_V1.md`

## 1. Purpose

Provider Adapter is the portability boundary between the Agent Harness and concrete model providers, gateways, or local runtimes.

The Agent Harness should call one internal interface. The adapter should hide provider-specific request shapes, model names, errors, usage formats, and authentication details.

This protects the product from provider lock-in.

## 2. Adapter Types

| Type | Meaning | Examples |
| --- | --- | --- |
| `direct_provider` | First-class integration with a provider | OpenAI direct, selected domestic providers |
| `aggregated_gateway` | SaaS gateway that exposes many models | OpenRouter or similar |
| `self_hosted_gateway` | Product/customer controlled gateway | LiteLLM, Portkey-like gateway, internal proxy |
| `local_gateway` | Local or private model endpoint | Ollama, LM Studio, vLLM, enterprise inference |

Adapter type should be metadata. The harness should not branch on vendor names unless a specific capability requires it.

## 3. Provider Descriptor

Every adapter must expose a provider descriptor.

```json
{
  "provider_id": "openai",
  "display_name": "OpenAI",
  "adapter_type": "direct_provider",
  "status": "enabled | disabled | experimental",
  "auth_modes": ["platform_managed", "workspace_managed", "byok_advanced"],
  "regions": ["global"],
  "novice_visible": false,
  "supports_health_check": true,
  "supports_usage_reporting": true,
  "supports_cost_estimation": true
}
```

## 4. Model Descriptor

Every adapter must expose normalized model descriptors.

```json
{
  "provider_id": "openai",
  "model_ref": "openai:model-id",
  "provider_model_id": "model-id",
  "display_name": "Model Display Name",
  "status": "enabled | disabled | experimental | deprecated",
  "tiers": ["standard", "strong_reasoning"],
  "capabilities": {
    "tool_calling": "yes | partial | no | unknown",
    "structured_output": "yes | partial | no | unknown",
    "streaming": "yes | partial | no | unknown",
    "long_context": "yes | partial | no | unknown",
    "embeddings": "yes | partial | no | unknown",
    "multimodal": "yes | partial | no | unknown",
    "local_execution": "yes | partial | no | unknown"
  },
  "limits": {
    "context_window_tokens": 128000,
    "max_output_tokens": 8192
  },
  "cost": {
    "input_per_million_tokens": 0,
    "output_per_million_tokens": 0,
    "currency": "USD",
    "source": "provider | gateway | product_config | unknown"
  }
}
```

Model descriptors can be static in MVP and refreshed later.

## 5. Internal Request Shape

The harness should send a normalized request to adapters.

```json
{
  "request_id": "req_01",
  "agent_run_id": "run_01",
  "purpose": "task_routing | agent_reasoning | context_compression | guardrail | output_repair",
  "model_ref": "openai:model-id",
  "messages": [
    {
      "role": "system | user | assistant | tool",
      "content": "string"
    }
  ],
  "tools": [
    {
      "name": "search_notes",
      "description": "string",
      "schema": {}
    }
  ],
  "output": {
    "mode": "text | json | schema",
    "schema": {}
  },
  "settings": {
    "temperature": 0.2,
    "max_output_tokens": 2048,
    "stream": false
  },
  "policy": {
    "privacy_mode": "normal",
    "allow_cloud": true,
    "allow_fallback": true
  }
}
```

## 6. Internal Response Shape

Adapters must return normalized responses.

```json
{
  "request_id": "req_01",
  "agent_run_id": "run_01",
  "status": "succeeded | failed | partial",
  "provider_id": "openai",
  "model_ref": "openai:model-id",
  "output": {
    "type": "text | json | tool_calls",
    "content": "string",
    "json": {},
    "tool_calls": []
  },
  "usage": {
    "input_tokens": 1000,
    "output_tokens": 500,
    "cached_input_tokens": 0,
    "total_tokens": 1500,
    "estimated_cost": 0.01,
    "currency": "USD"
  },
  "timing": {
    "started_at": "iso_datetime",
    "ended_at": "iso_datetime",
    "duration_ms": 4200
  },
  "error": null,
  "raw_ref": "optional encrypted/local raw response reference"
}
```

Raw provider responses should not become product state.

## 7. Streaming Event Shape

Streaming should be normalized into events.

```json
{
  "event_type": "output_delta | tool_call_delta | tool_call_ready | usage_update | error | completed",
  "request_id": "req_01",
  "agent_run_id": "run_01",
  "delta": "string",
  "tool_call": {},
  "usage": {},
  "error": null
}
```

Providers that do not support streaming can return a single completed response.

## 8. Tool Call Normalization

Tool calls should normalize to this shape.

```json
{
  "tool_call_id": "tool_call_01",
  "name": "search_notes",
  "arguments": {},
  "status": "requested | running | succeeded | failed",
  "provider_raw_name": "optional string"
}
```

If a provider does not support reliable tool calling:

- Do not route tool-dependent agents to it by default.
- Or use an explicit output-repair/tool-simulation path marked as experimental.
- Log the capability downgrade.

## 9. Error Normalization

Adapters must normalize provider errors.

```json
{
  "error_type": "auth_error | rate_limit | timeout | provider_unavailable | model_unavailable | capability_mismatch | validation_error | content_policy | budget_exceeded | unknown",
  "error_code": "string",
  "message": "safe user-visible message",
  "developer_message": "optional internal detail",
  "retryable": true,
  "provider_status_code": 429,
  "provider_request_id": "optional string"
}
```

Error messages shown to novice users should be plain-language and action-oriented.

## 10. Health Check

Adapters should expose a health check when possible.

```json
{
  "provider_id": "openai",
  "status": "healthy | degraded | down | unknown",
  "latency_ms": 300,
  "checked_at": "iso_datetime",
  "message": "optional string"
}
```

Health should influence Model Policy fallback choices, especially for scheduled tasks.

## 11. Authentication Contract

Adapters should support one or more auth modes.

Provider-specific endpoint, secret reference, non-secret headers, and health-check configuration are defined in `PROVIDER_CONFIG_CONTRACT_V1.md`.

```json
{
  "auth_mode": "platform_managed | workspace_managed | byok_advanced | local_no_key | enterprise_secret",
  "secret_ref": "secret_01",
  "requires_user_setup": false,
  "setup_url": "optional string"
}
```

Rules:

- Novice onboarding should not require BYOK if platform-managed AI is available.
- User-provided keys must be stored through secure OS/cloud/enterprise secret storage.
- Local no-key adapters should not require cloud credentials.
- Secrets should never be written to Run Logs.

## 12. Cost and Usage Contract

Adapters should return provider usage when available.

If provider usage is unavailable:

- Estimate tokens locally.
- Mark cost source as `estimated`.
- Do not present exact cost to user.

Usage source:

```json
{
  "usage_source": "provider_reported | gateway_reported | locally_estimated | unavailable"
}
```

The Run Log should record the source of cost data.

## 13. Capability Test Suite

Each adapter should pass a minimum capability test suite before being used in production routing.

Required tests:

- Basic text response.
- JSON/schema output.
- Tool call round trip if `tool_calling` is enabled.
- Streaming if `streaming` is enabled.
- Usage reporting.
- Error normalization.
- Timeout handling.
- Fallback compatibility.
- Chinese note summary sample.
- English paper summary sample.
- Mixed-language synthesis sample.

## 14. MVP Adapter Set

Recommended MVP:

- `openai_direct_adapter`
- `openai_compatible_gateway_adapter`
- `mock_provider_adapter` for tests

P1:

- `domestic_provider_adapter`
- `local_gateway_adapter`

P2:

- `self_hosted_gateway_adapter`
- `enterprise_provider_adapter`

## 15. Anti-Coupling Rules

Implementation should avoid:

- Agent code importing provider SDKs directly.
- UI code depending on provider model ids.
- Scheduler hardcoding provider names.
- Artifact schema storing provider-native response payloads as required fields.
- Run Log requiring provider-specific formats.
- Provider errors leaking raw technical details into novice UI.

## 16. Open Questions

- Should adapter implementations live in one package or separate packages?
- Should provider descriptors be static config, remote config, or both?
- Should model capability tests run in CI, admin setup, or both?
- Should gateways expose real provider names to users, or only model packs?
- How should local runtime discovery work on desktop?

