# Model Provider Capability Matrix

> Status: draft decision matrix
> Date: 2026-05-09
> Workstream: `feat/ai-agent-layer`
> Related: `MODEL_ROUTING_POLICY_V1.md`, `MODEL_SWITCHING_PROBLEM_MATRIX.md`, `AGENT_HARNESS_ARCHITECTURE_V1.md`

## 1. Purpose

This document maps candidate model provider paths to the capabilities needed by the AI / Agent layer.

The goal is not to pick every model now. The goal is to decide the first integration shape:

- Direct provider integrations where reliability and SDK support matter.
- Aggregated gateways where broad model coverage matters.
- Self-hosted gateways where cost control, observability, and enterprise control matter.
- Local/private providers where privacy matters.

## 2. Source Notes

Provider capabilities change quickly. Treat this matrix as an implementation planning tool, not a permanent truth table.

Sources checked for this draft:

- OpenAI Agents SDK model docs: https://openai.github.io/openai-agents-python/models/
- OpenRouter provider routing docs: https://openrouter.ai/docs/guides/routing/provider-selection
- LiteLLM provider docs: https://docs.litellm.ai/docs/providers
- Ollama OpenAI compatibility docs: https://docs.ollama.com/api/openai-compatibility
- DeepSeek API docs: https://api-docs.deepseek.com/
- Alibaba Cloud Model Studio OpenAI-compatible Qwen docs: https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope
- Kimi API overview: https://platform.kimi.ai/docs/api/overview

## 3. Capability Definitions

| Capability | Meaning |
| --- | --- |
| `agents_sdk_native` | Works through the OpenAI Agents SDK's native OpenAI path with minimal adaptation |
| `openai_compatible` | Can be called through OpenAI-compatible Chat Completions or Responses-like API surfaces |
| `tool_calling` | Supports function/tool calling well enough for Agent tools |
| `structured_output` | Supports reliable JSON or schema-shaped output for AI artifacts |
| `long_context` | Useful for long notes, papers, and multi-source synthesis |
| `streaming` | Can stream output for interactive UI |
| `embeddings` | Can provide embeddings or has a companion embedding API |
| `multimodal` | Supports images/files or other non-text inputs |
| `routing_fallback` | Supports provider/model fallback or can be placed behind one |
| `budget_controls` | Supports spend tracking, virtual keys, quotas, or pricing metadata |
| `local_private` | Can run on local/private infrastructure |
| `region_fit` | Useful for China, global, enterprise, or local/offline deployment |

Values:

- `yes`: expected support.
- `partial`: possible but needs validation.
- `via_gateway`: available through a gateway or adapter.
- `model_dependent`: depends heavily on the selected model.
- `no`: not expected for this provider path.
- `unknown`: validate during implementation.

## 4. Provider Path Matrix

| Provider Path | Role | Interface | Strength | Main Risk | MVP Use |
| --- | --- | --- | --- | --- | --- |
| OpenAI direct | Baseline provider | Agents SDK native / OpenAI APIs | Strong SDK alignment, tracing path, tool/agent fit | Cost and regional availability | P0 baseline |
| OpenRouter adapter | Aggregated SaaS gateway | OpenAI-compatible | Broad model access, provider routing, fallbacks | Vendor dependency, provider-specific behavior variance | P0/P1 broad coverage |
| LiteLLM or self-hosted gateway | Internal or enterprise gateway | Unified proxy / OpenAI-compatible | Routing, virtual keys, spend controls, many providers | Operational overhead | P1 enterprise/control path |
| DashScope / Qwen direct | Domestic and Qwen family path | OpenAI-compatible | Strong China-region fit, Qwen ecosystem | Per-model capability variance | P1 China Optimized pack |
| DeepSeek direct | Domestic reasoning/cost candidate | OpenAI/Anthropic-compatible | Reasoning models, JSON/tool docs, agent tool ecosystem | Model naming and capability changes | P1 China Optimized / low-cost reasoning candidate |
| Kimi / Moonshot direct | Domestic long-context and agent candidate | OpenAI-compatible | Kimi ecosystem, tool use, file/token endpoints | Parameter extensions and per-model variance | P1 long-context domestic candidate |
| MiniCPM local | Local/private model family | OpenAI-compatible local gateway | Local-first AI, privacy, low marginal cost, good early desktop experimentation | Runtime setup and per-model capability variance | P1 MiniCPM Local pack |
| MiniCPM remote third-party | Hosted MiniCPM-compatible model path | OpenAI-compatible third-party gateway | Lets early users try MiniCPM without local runtime setup | Third-party data boundary, model id variance, gateway reliability | P1 MiniCPM Remote pack |
| Ollama local | Local/private model runner | Partial OpenAI-compatible local API | No cloud key, privacy, offline/local experimentation | Model quality and tool reliability vary | P1/P2 Local / Private mode |
| LM Studio local | Local/private desktop runner | OpenAI-compatible local server | User-friendly local model setup | Desktop-only operational variance | P2 Local / Private mode |
| vLLM / enterprise inference | Private/self-hosted inference | OpenAI-compatible server patterns | Enterprise control, private deployment | Requires infra expertise | P2 enterprise private path |

## 5. Capability Matrix

| Provider Path | agents_sdk_native | openai_compatible | tool_calling | structured_output | long_context | streaming | embeddings | multimodal | routing_fallback | budget_controls | local_private | region_fit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OpenAI direct | yes | yes | yes | yes | model_dependent | yes | yes | model_dependent | via_policy | via_product | no | global |
| OpenRouter adapter | partial | yes | model_dependent | model_dependent | model_dependent | yes | model_dependent | model_dependent | yes | partial | no | global |
| LiteLLM/self-hosted gateway | partial | yes | model_dependent | model_dependent | model_dependent | partial | model_dependent | model_dependent | yes | yes | partial | global/enterprise |
| DashScope / Qwen direct | no | yes | model_dependent | model_dependent | model_dependent | yes | model_dependent | model_dependent | via_policy | via_product | no | China/global regions |
| DeepSeek direct | no | yes | partial | yes | model_dependent | yes | unknown | unknown | via_policy | via_product | no | China/global |
| Kimi / Moonshot direct | no | yes | partial | model_dependent | model_dependent | yes | unknown | model_dependent | via_policy | via_product | no | China/global |
| MiniCPM local | no | partial | model_dependent | model_dependent | model_dependent | partial | model_dependent | model_dependent | via_policy | local/free | yes | local/offline |
| MiniCPM remote third-party | no | yes | model_dependent | model_dependent | model_dependent | yes | model_dependent | model_dependent | via_policy | gateway/provider | no | China/global |
| Ollama local | no | partial | model_dependent | model_dependent | model_dependent | partial | model_dependent | model_dependent | via_policy | local/free | yes | local/offline |
| LM Studio local | no | partial | model_dependent | model_dependent | model_dependent | partial | model_dependent | model_dependent | via_policy | local/free | yes | local/offline |
| vLLM / enterprise inference | no | partial | model_dependent | model_dependent | model_dependent | partial | model_dependent | model_dependent | via_gateway | enterprise | yes | enterprise/private |

## 6. Recommended MVP Provider Strategy

### 6.1 P0: OpenAI Direct Baseline

Use OpenAI direct integration as the first reliable path.

Reasons:

- Best alignment with OpenAI Agents SDK.
- Simplest path for agent tools, tracing, and model settings.
- Good baseline for evaluating other providers.

Use cases:

- Reflection Agent.
- Synthesis Agent.
- Originality Guard when model assistance is needed.
- First SDK runner prototype.

### 6.2 P0/P1: One Aggregated Gateway Adapter

Add one aggregated OpenAI-compatible gateway adapter.

Candidates:

- OpenRouter for faster SaaS-based broad model coverage.
- LiteLLM proxy if the team wants more control from the start.

Recommendation:

- Use OpenRouter for quick model coverage in early experiments.
- Keep the adapter interface generic so LiteLLM or another gateway can replace or complement it.
- Do not let OpenRouter own the product's task routing, privacy policy, or user-facing modes.

Use cases:

- Power user model exploration.
- Comparing domestic and international models.
- Cheap model candidates for routing, summaries, and relation discovery.

### 6.3 P1: China Optimized Provider Pack

Add direct or gateway-backed support for selected domestic providers.

Candidate paths:

- DashScope / Qwen.
- DeepSeek.
- Kimi / Moonshot.

Use cases:

- China-region availability.
- Chinese notes and Chinese source material.
- Lower-cost routine work.
- Long-context or reasoning experiments, depending on model validation.

MVP rule:

- Do not expose these raw providers to novice users at first.
- Package them behind `China Optimized` and `Auto` modes.

### 6.4 P1/P2: Local / Private Mode

Support local/private providers after the core cloud path is stable.

Candidate paths:

- MiniCPM local gateway as the first named local model family.
- Ollama.
- LM Studio.
- vLLM or enterprise inference server.
- MiniCPM remote third-party gateway as an optional early fallback when local runtime setup is not ready.

Use cases:

- Sensitive private projects.
- Offline or local-first workflows.
- Enterprise deployments.
- Users who strongly prefer no cloud AI.

MVP rule:

- Keep the `Local / Private` mode in the UX now.
- Ship full local setup after the provider adapter and privacy gate are stable.

## 7. Provider Adapter Contract

Every provider adapter should expose the same internal shape.

```json
{
  "provider_id": "openai",
  "display_name": "OpenAI",
  "adapter_type": "direct_provider | aggregated_gateway | self_hosted_gateway | local_gateway",
  "auth_modes": ["platform_managed", "workspace_managed", "byok_advanced"],
  "regions": ["global"],
  "capabilities": {
    "tool_calling": "yes",
    "structured_output": "yes",
    "streaming": "yes",
    "embeddings": "yes",
    "multimodal": "model_dependent"
  },
  "model_tiers": {
    "router_fast": ["model-ref"],
    "cheap_fast": ["model-ref"],
    "standard": ["model-ref"],
    "strong_reasoning": ["model-ref"]
  },
  "supports_fallback": true,
  "supports_cost_estimation": true,
  "novice_visible": false
}
```

## 8. Model Capability Test Checklist

Before a model can be used by an agent, test:

- Basic chat completion.
- Streaming completion.
- Tool call round trip.
- Structured JSON output.
- Schema validation and retry.
- Long Context Pack handling.
- Chinese note summarization.
- English paper summarization.
- Mixed Chinese/English synthesis.
- Citation preservation.
- Privacy policy rejection path.
- Token usage reporting.
- Error normalization.
- Fallback behavior.

## 9. User Visibility Rules

Novice users see:

- `Auto`
- `Economy`
- `Balanced`
- `Deep Thinking`
- `Local / Private`

Novice users do not see:

- Raw model ids.
- Provider API keys.
- Token pricing tables.
- Provider fallbacks.
- Tool capability flags.

Power users can see:

- Provider.
- Model.
- BYOK setup.
- Per-task preferred model.
- Fallback permission.
- Monthly budget.

Admins can see:

- Provider allowlist.
- Workspace keys.
- Audit logs.
- Region policy.
- Data retention policy.
- Budget and quota rules.

## 10. MVP Decisions

- P0 direct provider: OpenAI.
- P0/P1 aggregated gateway: evaluate OpenRouter first for speed, keep adapter generic.
- P1 self-hosted gateway: evaluate LiteLLM if budget control, virtual keys, or enterprise support becomes urgent.
- P1 domestic pack: evaluate DashScope/Qwen, DeepSeek, and Kimi/Moonshot.
- P1/P2 local pack: evaluate Ollama first, then LM Studio or vLLM depending on target users.
- Default novice path: platform-managed AI plus `Auto`.
- BYOK path: advanced settings only.
- Provider/model names: hidden from novice flows.

## 11. Open Questions

- Should OpenRouter be included in the shipped product or only in internal experiments?
- Should LiteLLM be deployed by the product team, customers, or both?
- Which domestic provider should be first-class rather than only gateway-backed?
- Should local/private mode target Ollama first because of simplicity, or vLLM first because of enterprise fit?
- How should provider health be measured for scheduled tasks?
- How often should provider capability metadata be refreshed?
- Should the product maintain its own price table or rely on gateway/provider reported usage?
