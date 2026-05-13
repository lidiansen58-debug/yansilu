# Model Pack Config Contract V1

> Status: draft implementation contract
> Date: 2026-05-11
> Workstream: `feat/ai-agent-layer`
> Related: `MODEL_PACKS_AND_USER_SETTINGS_V1.md`, `MODEL_ROUTING_POLICY_V1.md`, `PROVIDER_ADAPTER_INTERFACE_V1.md`, `MODEL_NEUTRALITY_AND_PORTABILITY_PRINCIPLES.md`

## 1. Purpose

Model packs are the product boundary between a simple user experience and a flexible multi-provider model layer.

Normal users should choose intent-level modes such as `Auto`, `Economy`, `Deep Thinking`, or `Local / Private`. The system should compile those choices into provider presets, model tiers, budget rules, privacy policy, and fallback behavior.

This contract defines the minimum config shape that can later be stored in code, JSON, database rows, workspace settings, or enterprise policy files.

Executable schema and validation binding:

- `schemas/model_pack_config.schema.json`
- `packages/ai-orchestrator/src/model-pack-config-contract.mjs`
- `tests/unit/ai-model-pack-config-contract.test.mjs`

## 2. Design Rule

```text
User chooses simple mode or model pack
  -> Settings compiler resolves normalized AI settings
  -> Model Policy chooses tier and provider candidate
  -> Provider Adapter executes concrete model request
  -> Run Log records actual provider/model/fallback
```

Model packs must not make agents depend on raw model ids. Agents ask for capabilities and tiers. Model packs shape policy.

## 3. Core Enums

### 3.1 User Modes

```json
["Auto", "Economy", "Balanced", "Deep Thinking", "Local / Private"]
```

Rules:

- `Auto` is the default for novice users.
- `Economy` can downgrade expensive work unless the user confirms.
- `Balanced` is the stable middle path for power users and teams.
- `Deep Thinking` can escalate reasoning-heavy work.
- `Local / Private` must prefer local or enterprise-private providers and must not silently fall back to cloud.

### 3.2 Model Tiers

```json
["router_fast", "cheap_fast", "standard", "strong_reasoning", "guardrail", "local_private"]
```

Rules:

- Agents request tiers, not provider model ids.
- `router_fast` and `cheap_fast` should be used for high-volume routine work.
- `strong_reasoning` should be reserved for high-value synthesis, reflection, and important writing support.
- `local_private` is selected by privacy policy or explicit user mode.
- `guardrail` can be rules-first, model-assisted, or both.

### 3.3 Auth Modes

```json
["platform_managed", "workspace_managed", "byok_advanced", "local_no_key", "enterprise_secret"]
```

Rules:

- `platform_managed` is the novice default.
- `byok_advanced` is optional and should not appear in first-run onboarding when platform-managed AI is available.
- `workspace_managed` lets team admins configure keys while members keep simple modes.
- `local_no_key` supports local runtimes such as local OpenAI-compatible servers.
- `enterprise_secret` supports enterprise secret stores and private gateways.

## 4. Model Pack Shape

Each model pack should compile to this normalized shape.

```json
{
  "model_pack_id": "starter_auto",
  "model_pack": "Starter Auto",
  "description": "Default simple setup with platform-managed AI and automatic routing.",
  "default_user_mode": "Auto",
  "provider_preset": "platform_managed_openai",
  "auth_mode": "platform_managed",
  "provider_visibility": "hidden",
  "byok_required": false,
  "fallback_policy": {
    "allow_same_provider_fallback": true,
    "allow_cross_provider_fallback": true,
    "allow_cloud_fallback": true,
    "allow_cloud_fallback_for_private": false,
    "requires_confirmation_for_cloud": false
  },
  "budget": {
    "monthly_limit": 10,
    "confirmation_threshold_per_run": 0.25,
    "scheduled_task_hard_cap": 1,
    "currency": "USD"
  },
  "privacy": {
    "default_mode": "normal",
    "allow_cloud": true,
    "local_preferred": false
  }
}
```

Required fields:

- `model_pack_id`
- `model_pack`
- `default_user_mode`
- `provider_preset`
- `auth_mode`
- `provider_visibility`
- `fallback_policy`
- `budget`
- `privacy`

## 5. Provider Preset Shape

Provider presets are not user-facing model packs. They are implementation hints for the Provider Adapter layer.

```json
{
  "provider_preset": "openai_compatible_gateway",
  "provider_id": "openai_compatible_gateway",
  "display_name": "OpenAI-Compatible Gateway",
  "adapter_type": "aggregated_gateway",
  "status": "experimental",
  "auth_modes": ["workspace_managed", "byok_advanced"],
  "regions": ["global"],
  "novice_visible": false,
  "capabilities": {
    "openai_compatible": "yes",
    "tool_calling": "model_dependent",
    "structured_output": "model_dependent",
    "streaming": "yes",
    "routing_fallback": "yes",
    "budget_controls": "partial"
  },
  "model_map": {
    "router_fast": "openai_compatible_gateway:router_fast",
    "cheap_fast": "openai_compatible_gateway:cheap_fast",
    "standard": "openai_compatible_gateway:standard",
    "strong_reasoning": "openai_compatible_gateway:strong_reasoning",
    "guardrail": "openai_compatible_gateway:guardrail"
  },
  "runtime_model_map": {
    "openai_compatible_gateway:standard": "gateway-standard-model"
  }
}
```

Rules:

- `provider_preset` can point to OpenAI direct, OpenRouter-like gateways, LiteLLM-like gateways, domestic providers, or local/private runtimes.
- `model_map` contains internal model refs, not novice UI labels.
- `runtime_model_map` resolves internal model refs into concrete runtime or gateway model ids.
- Actual provider model ids should remain inside runtime model maps, adapter config, admin settings, or secret-backed provider descriptors.
- `novice_visible: false` means the user can use the capability without seeing provider complexity.

## 6. Default Packs

### 6.1 Starter Auto

```json
{
  "model_pack_id": "starter_auto",
  "model_pack": "Starter Auto",
  "default_user_mode": "Auto",
  "provider_preset": "platform_managed_openai",
  "auth_mode": "platform_managed",
  "provider_visibility": "hidden",
  "byok_required": false
}
```

Use when:

- The user is new.
- Platform-managed AI is available.
- The product wants immediate value without provider setup.

### 6.2 Low Cost Research

```json
{
  "model_pack_id": "low_cost_research",
  "model_pack": "Low Cost Research",
  "default_user_mode": "Economy",
  "provider_preset": "openai_compatible_gateway",
  "auth_mode": "workspace_managed",
  "provider_visibility": "advanced",
  "fallback_policy": {
    "requires_confirmation_for_strong_reasoning": true
  }
}
```

Use when:

- The user runs many summaries, scans, and research-card jobs.
- The product wants cheap prefiltering before expensive synthesis.

### 6.3 Deep Work

```json
{
  "model_pack_id": "deep_work",
  "model_pack": "Deep Work",
  "default_user_mode": "Deep Thinking",
  "provider_preset": "platform_managed_openai",
  "auth_mode": "platform_managed",
  "provider_visibility": "advanced",
  "fallback_policy": {
    "requires_confirmation_for_broad_context": true
  }
}
```

Use when:

- The user is doing reflection, synthesis, argument analysis, or important writing support.
- The context should be selected and bounded before the run.

### 6.4 Privacy First

```json
{
  "model_pack_id": "privacy_first",
  "model_pack": "Privacy First",
  "default_user_mode": "Local / Private",
  "provider_preset": "local_private_gateway",
  "auth_mode": "local_no_key",
  "provider_visibility": "advanced",
  "fallback_policy": {
    "allow_cross_provider_fallback": false,
    "allow_cloud_fallback": false,
    "allow_cloud_fallback_for_private": false,
    "requires_confirmation_for_cloud": true
  },
  "privacy": {
    "default_mode": "local_only",
    "allow_cloud": false,
    "local_preferred": true
  }
}
```

Use when:

- Notes or projects are sensitive.
- The user wants local/private operation.
- Cloud fallback should require explicit policy change, not just runtime convenience.

### 6.5 China Optimized

```json
{
  "model_pack_id": "china_optimized",
  "model_pack": "China Optimized",
  "default_user_mode": "Auto",
  "provider_preset": "china_optimized_gateway",
  "auth_mode": "workspace_managed",
  "provider_visibility": "advanced",
  "fallback_policy": {
    "allow_cross_provider_fallback": false,
    "requires_confirmation_for_international_fallback": true
  }
}
```

Use when:

- Users need China-region-friendly availability.
- Chinese notes, Chinese sources, or mixed Chinese/English synthesis are common.
- Domestic providers should be packaged behind simple modes instead of exposed during onboarding.

### 6.6 MiniCPM Local

```json
{
  "model_pack_id": "minicpm_local",
  "model_pack": "MiniCPM Local",
  "default_user_mode": "Local / Private",
  "provider_preset": "minicpm_local_gateway",
  "auth_mode": "local_no_key",
  "provider_visibility": "advanced",
  "fallback_policy": {
    "allow_cross_provider_fallback": false,
    "allow_cloud_fallback": false,
    "allow_cloud_fallback_for_private": false,
    "requires_confirmation_for_cloud": true
  },
  "privacy": {
    "default_mode": "local_only",
    "allow_cloud": false,
    "local_preferred": true
  }
}
```

Use when:

- MiniCPM should be the first named local model family.
- The user has a local OpenAI-compatible runtime or desktop gateway.
- Private notes should not leave the local machine.

### 6.7 MiniCPM Remote

```json
{
  "model_pack_id": "minicpm_remote",
  "model_pack": "MiniCPM Remote",
  "default_user_mode": "Balanced",
  "provider_preset": "minicpm_remote_gateway",
  "auth_mode": "workspace_managed",
  "provider_visibility": "advanced",
  "fallback_policy": {
    "allow_cross_provider_fallback": false,
    "allow_cloud_fallback": true,
    "allow_cloud_fallback_for_private": false,
    "requires_confirmation_for_international_fallback": true
  },
  "privacy": {
    "default_mode": "normal",
    "allow_cloud": true,
    "local_preferred": false
  }
}
```

Use when:

- Early MiniCPM testing should not depend on local runtime setup.
- A third-party MiniCPM-compatible gateway is configured with workspace-managed credentials.
- The user understands that this is a remote provider path, not `local_only`.

### 6.8 Global Optimized

```json
{
  "model_pack_id": "global_optimized",
  "model_pack": "Global Optimized",
  "default_user_mode": "Auto",
  "provider_preset": "openai_compatible_gateway",
  "auth_mode": "workspace_managed",
  "provider_visibility": "advanced",
  "fallback_policy": {
    "allow_cross_provider_fallback": true,
    "allow_cloud_fallback": true
  }
}
```

Use when:

- The user or workspace values broad model availability.
- Gateway fallback is acceptable under privacy and budget policy.

## 7. Settings Compilation

The settings compiler should accept user or workspace preferences and return a normalized policy object.

Input:

```json
{
  "user_mode": "Economy",
  "model_pack": "Low Cost Research",
  "workspace_id": "workspace_01",
  "user_id": "user_01"
}
```

Compiled output:

```json
{
  "user_mode": "Economy",
  "model_pack_id": "low_cost_research",
  "model_pack": "Low Cost Research",
  "provider_preset": "openai_compatible_gateway",
  "auth_mode": "workspace_managed",
  "provider_visibility": "advanced",
  "platform_managed": false,
  "byok_required": false,
  "novice_provider_details_hidden": false,
  "fallback_policy": {
    "allow_same_provider_fallback": true,
    "allow_cross_provider_fallback": true,
    "allow_cloud_fallback": true,
    "allow_cloud_fallback_for_private": false,
    "requires_confirmation_for_strong_reasoning": true
  },
  "budget": {
    "monthly_limit": 5,
    "confirmation_threshold_per_run": 0.1,
    "scheduled_task_hard_cap": 0.5,
    "currency": "USD"
  },
  "privacy": {
    "default_mode": "normal",
    "allow_cloud": true,
    "local_preferred": false
  }
}
```

## 8. Routing Examples

### 8.1 Novice Auto Summary

```json
{
  "task_type": "source_summary",
  "agent_default_tier": "standard",
  "user_mode": "Auto",
  "model_pack": "Starter Auto",
  "privacy_mode": "normal"
}
```

Expected route:

```json
{
  "selected_tier": "standard",
  "provider_preset": "platform_managed_openai",
  "auth_mode": "platform_managed",
  "cloud_allowed": true,
  "confirmation_required": false
}
```

### 8.2 Economy Reflection Request

```json
{
  "task_type": "reflection_prompt",
  "agent_default_tier": "strong_reasoning",
  "user_mode": "Economy",
  "model_pack": "Low Cost Research",
  "privacy_mode": "normal"
}
```

Expected route:

```json
{
  "requested_tier": "strong_reasoning",
  "selected_tier": "standard",
  "confirmation_required": true,
  "downgraded_from": "strong_reasoning"
}
```

### 8.3 Local-Only Note Analysis

```json
{
  "task_type": "sensitive_private_note_analysis",
  "agent_default_tier": "standard",
  "user_mode": "Local / Private",
  "model_pack": "Privacy First",
  "privacy_mode": "local_only"
}
```

Expected route:

```json
{
  "selected_tier": "local_private",
  "provider_preset": "local_private_gateway",
  "auth_mode": "local_no_key",
  "cloud_allowed": false,
  "allow_cloud_fallback": false
}
```

### 8.4 China Optimized Research Card

```json
{
  "task_type": "paper_news_research_card",
  "agent_default_tier": "standard",
  "user_mode": "Auto",
  "model_pack": "China Optimized",
  "privacy_mode": "normal"
}
```

Expected route:

```json
{
  "selected_tier": "standard",
  "provider_preset": "china_optimized_gateway",
  "auth_mode": "workspace_managed",
  "requires_confirmation_for_international_fallback": true
}
```

## 9. Validation Rules

Model pack config is valid only if:

- `default_user_mode` is one of the supported user modes.
- `provider_preset` resolves to a known provider preset.
- `auth_mode` is allowed by the provider preset.
- `provider_visibility` is `hidden`, `advanced`, or `admin`.
- `budget.confirmation_threshold_per_run` is not greater than `budget.monthly_limit` unless monthly limits are disabled.
- `privacy.default_mode: local_only` implies `privacy.allow_cloud: false`.
- `Local / Private` implies no silent cloud fallback.
- `allow_cloud_fallback_for_private` defaults to `false`.
- Raw provider model ids do not appear in novice UI copy.
- `runtime_model_map` keys must reference values from `model_map`, not user-facing tier names.
- Fallback policy cannot override privacy policy.

## 10. Implementation Binding

The first implementation can keep these presets in code while the product is still early.

Recommended files:

- `schemas/model_pack_config.schema.json`: JSON Schema contract for config bundles.
- `packages/ai-orchestrator/src/model-packs.mjs`: user modes, model pack defaults, settings compilation.
- `packages/ai-orchestrator/src/model-pack-config-contract.mjs`: conversion and validation for built-in config bundles.
- `packages/ai-orchestrator/src/provider-presets.mjs`: provider preset descriptors and tier-to-model-ref maps.
- `packages/ai-orchestrator/src/model-router.mjs`: tier selection, privacy gates, fallback flags, confirmation flags.
- `packages/ai-orchestrator/src/run-log.mjs`: record model pack, user mode, provider, selected tier, cost estimate, fallback path.

Later migration path:

- Move pack definitions into database-backed workspace policy.
- Allow enterprise admins to import signed policy files.
- Allow community model packs only after validation and capability tests exist.
- Keep built-in packs as a stable fallback if imported config is invalid.

## 11. MVP Decision

The MVP should ship with these built-in packs:

- `Starter Auto`
- `Low Cost Research`
- `Deep Work`
- `Privacy First`
- `MiniCPM Local`
- `MiniCPM Remote`
- `China Optimized`
- `Global Optimized`

Novice onboarding should expose only:

- `Auto`
- `Monthly AI usage`
- `Pause background AI`
- a short privacy summary

Power users and admins can see packs, providers, BYOK, workspace keys, fallback rules, and budget thresholds in advanced settings.
