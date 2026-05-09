# Model Neutrality and Portability Principles

> Status: architecture principles
> Date: 2026-05-09
> Workstream: `feat/ai-agent-layer`
> Related: `MODEL_PROVIDER_CAPABILITY_MATRIX.md`, `MODEL_ROUTING_POLICY_V1.md`, `AGENT_HARNESS_ARCHITECTURE_V1.md`

## 1. Purpose

The AI / Agent layer should not be locked into one model, one provider, one gateway, or one deployment mode.

Users should have more choices over time:

- Platform-managed AI for novice users.
- BYOK for power users.
- Workspace-managed keys for teams.
- Domestic providers for China-friendly routing.
- International providers for global quality and availability.
- Open-source hosted models for cost and flexibility.
- Local/private models for privacy.
- Enterprise gateways for compliance and control.

The product should expose this flexibility without making novice users configure providers or understand model ids.

## 2. Core Principle

```text
Agents depend on capabilities.
Model Policy chooses providers and models.
Provider Adapters execute calls.
Users choose simple intent-level modes.
```

This means:

- An agent asks for `standard`, `strong_reasoning`, `tool_calling`, `structured_output`, or `local_private`.
- The Model Policy decides which provider/model satisfies that need.
- The Provider Adapter normalizes provider-specific details.
- The user sees `Auto`, `Economy`, `Balanced`, `Deep Thinking`, or `Local / Private`.

## 3. Architecture Red Lines

These rules should be treated as architecture constraints.

### 3.1 Agents Must Not Hardcode Provider Models

Agent definitions should not directly depend on raw provider model ids.

Allowed:

```json
{
  "agent_id": "reflection_agent",
  "default_model_tier": "strong_reasoning",
  "required_capabilities": ["structured_output"]
}
```

Avoid:

```json
{
  "agent_id": "reflection_agent",
  "model": "specific-provider-model-id"
}
```

Advanced overrides can exist, but they should live in Model Policy or admin settings, not inside agent logic.

### 3.2 Provider Gateways Must Be Replaceable

OpenRouter, LiteLLM, Portkey, self-hosted gateways, and local OpenAI-compatible servers should all sit behind the same Provider Adapter boundary.

No third-party gateway should own:

- Task routing.
- Privacy policy.
- User-facing modes.
- Budget policy.
- Artifact provenance.
- Run Log schema.

Gateways can help execute requests. The product owns the intelligence policy.

### 3.3 OpenAI Agents SDK Is Runtime, Not Lock-In

OpenAI Agents SDK can be the first runtime because it provides useful agent orchestration, tools, tracing, and model configuration.

But the product should keep these concepts portable:

- Agent definitions.
- Tool contracts.
- Context Packs.
- Artifact schemas.
- Run Logs.
- Model routing policy.
- Provider adapter contract.

If another runtime is needed later, these product contracts should survive.

### 3.4 BYOK Must Not Be The Default Novice Path

BYOK is valuable, but it is a power-user and enterprise feature.

Novice default:

```text
platform_managed + Auto
```

Advanced options:

```text
byok_advanced
workspace_managed
enterprise_secret
local_no_key
```

The product should not ask normal users to create provider accounts, copy API keys, or choose model ids before experiencing value.

### 3.5 Local / Private Must Remain A First-Class Future Path

Even if the first MVP uses cloud providers, the architecture should keep `Local / Private` visible in the design.

This means:

- Privacy Gate runs before Model Policy.
- Context Packs carry privacy mode.
- `local_only` cannot fallback to cloud.
- Provider capability matrix includes local runtimes.
- Run Log records whether cloud models were used.

## 4. Portability Requirements

The product should support portability at these layers.

| Layer | Portability Requirement |
| --- | --- |
| Agent Registry | Agents use capability and tier declarations, not provider-specific models |
| Model Policy | Can map tiers to different providers per user/workspace/region |
| Provider Adapter | Can add/remove providers without rewriting agents |
| Context Pack | Stays model-agnostic and provider-agnostic |
| AI Artifact | Stores output with provenance, not provider-dependent format |
| Run Log | Records actual provider/model used without making it part of product logic |
| User Settings | Allows simple modes for novice users and provider overrides for advanced users |
| Scheduler | Uses budget/privacy/model policy, not hardcoded providers |

## 5. User Choice Model

Novice users:

- Use `Auto`.
- See simple cost and privacy labels.
- Do not see provider/model ids by default.
- Do not configure API keys during first-run onboarding.

Power users:

- Can choose provider.
- Can choose model pack.
- Can bring their own keys.
- Can set fallback policy.
- Can bind preferred providers to task types.

Teams:

- Admin configures workspace-managed keys.
- Members use simple modes.
- Workspace policy controls allowed providers.
- Budget and audit logs are centralized.

Enterprise:

- Provider allowlist.
- Private gateway.
- Enterprise secret store.
- Local/private deployment.
- Audit export.
- Region and compliance rules.

## 6. Provider Strategy

Recommended default path:

```text
P0: OpenAI direct baseline
P0/P1: one aggregated OpenAI-compatible gateway
P1: selected domestic provider pack
P1/P2: local/private runtime support
P2: enterprise self-hosted gateway
```

This is not a vendor commitment. It is an adoption sequence.

The product should be able to change:

- First aggregated gateway.
- First domestic provider.
- First local runtime.
- First enterprise gateway.

without rewriting agent logic or user-facing workflows.

## 7. Anti-Lock-In Checklist

Before implementing a feature, check:

- Does this feature hardcode a provider/model id into agent logic?
- Can this run through another provider with the same capability flags?
- Does the Run Log record actual provider/model without making it part of business logic?
- Can novice users avoid seeing this complexity?
- Can advanced users override it safely?
- Does privacy policy run before provider selection?
- Does fallback stay inside allowed provider and privacy policy?
- Can this work with platform-managed, BYOK, workspace-managed, and local modes?
- Does this create data that can be exported or migrated later?

## 8. Data Portability

The user's knowledge and AI history should not become trapped in one provider ecosystem.

Portable data:

- Notes.
- AI artifacts.
- Context Pack references.
- Run Logs.
- User decisions.
- Provider/model preferences.
- Scheduled task definitions.

Provider-specific fields should be stored as metadata, not as required application state.

## 9. MVP Implications

MVP should include:

- Direct OpenAI provider.
- Generic OpenAI-compatible provider adapter.
- Model Policy layer.
- Provider Adapter contract.
- User modes instead of raw model picker.
- Run Log provider/model recording.
- Privacy Gate before Model Policy.

MVP should avoid:

- Building UI around a single provider.
- Making OpenRouter the only abstraction.
- Requiring BYOK during onboarding.
- Giving agents direct write access to human notes.
- Assuming cloud fallback is always acceptable.
- Storing Context Packs in a provider-specific format.

## 10. Open Questions

- Should provider/model preferences be exportable as a user settings file?
- Should model packs be community-editable later?
- Should enterprise customers be able to disable all platform-managed providers?
- Should the product expose an OpenAI-compatible local gateway setup wizard?
- How should the UI explain `Auto` while still respecting user desire for control?

