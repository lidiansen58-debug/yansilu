# Model Packs and User Settings V1

> Status: draft UX and settings spec
> Date: 2026-05-09
> Workstream: `feat/ai-agent-layer`
> Related: `MODEL_ROUTING_POLICY_V1.md`, `MODEL_PACK_CONFIG_CONTRACT_V1.md`, `MODEL_NEUTRALITY_AND_PORTABILITY_PRINCIPLES.md`, `PROVIDER_ADAPTER_INTERFACE_V1.md`

## 1. Purpose

Most users should not need to understand providers, model ids, token pricing, context windows, or tool calling.

The product should expose simple intent-level choices while preserving advanced configurability underneath.

This document defines:

- Default novice model experience.
- Model packs.
- Advanced settings.
- BYOK and workspace-managed key flows.
- How settings map to Model Policy.

## 2. Default User Experience

Default for normal users:

```text
platform_managed + Auto
```

The user should be able to use AI without:

- Creating a provider account.
- Copying an API key.
- Choosing a model id.
- Understanding token pricing.
- Configuring fallback chains.

The first-run experience should focus on value, not configuration.

## 3. Simple Modes

| Mode | User Meaning | Internal Behavior |
| --- | --- | --- |
| `Auto` | Recommended. Let the app choose. | Model Policy selects task-appropriate tier/provider |
| `Economy` | Prefer lower cost and speed. | Avoid strong models unless user confirms |
| `Balanced` | Normal quality and cost. | Use standard tier, escalate selectively |
| `Deep Thinking` | Better reasoning for important work. | Prefer strong reasoning for reflection/synthesis |
| `Local / Private` | Keep work local/private when possible. | Use local/private provider; cloud fallback requires confirmation |

Novice UI should explain these in one short sentence each.

## 4. Model Packs

Model packs are presets that map simple user intent to Model Policy rules.

### 4.1 `Starter Auto`

Audience:

- Default consumer users.

Rules:

- Auth: platform-managed.
- Mode: `Auto`.
- Provider visibility: hidden.
- Budget: conservative included quota.
- Fallback: allowed within privacy policy.

### 4.2 `Low Cost Research`

Audience:

- Users running many summaries, RSS reads, or relation scans.

Rules:

- Prefer `cheap_fast` and `standard`.
- Use strong reasoning only for user-confirmed synthesis.
- Scheduled tasks have strict caps.
- Fallback prefers cheaper compatible providers.

### 4.3 `Deep Work`

Audience:

- Users doing synthesis, writing, and serious reflection.

Rules:

- Prefer `strong_reasoning` for reflection and synthesis.
- Show cost warnings for broad context.
- Require bounded selected scope.
- No broad background deep reasoning by default.

### 4.4 `Privacy First`

Audience:

- Sensitive projects, local-first users, privacy-conscious teams.

Rules:

- Prefer local/private providers.
- Disable cloud fallback by default.
- Require confirmation before any cloud model sees private context.
- Store full prompts only locally or not at all.

### 4.5 `China Optimized`

Audience:

- Users in China or users primarily working with Chinese material.

Rules:

- Prefer domestic or China-region-friendly providers.
- Hide provider complexity from novice users.
- International fallback only if user/workspace allows it.
- Evaluate Chinese note and mixed-language quality before default routing.

### 4.6 `Global Optimized`

Audience:

- Users prioritizing global quality and broad provider availability.

Rules:

- Prefer globally available direct or gateway providers.
- Allow provider fallback.
- Use platform-managed keys by default.

## 5. Settings Levels

### 5.1 Novice Settings

Visible:

- AI mode.
- Monthly AI usage indicator.
- Privacy mode summary.
- Pause all background AI.

Hidden:

- Provider list.
- Raw model ids.
- API keys.
- Token price tables.
- Tool capability flags.

### 5.2 Power User Settings

Visible:

- Model pack.
- Preferred provider.
- Preferred model for each task type.
- BYOK setup.
- Fallback permission.
- Per-run cost confirmation threshold.
- Scheduled task budgets.

### 5.3 Team Admin Settings

Visible:

- Workspace-managed keys.
- Provider allowlist.
- Default model pack.
- Member usage budgets.
- Scheduled task policy.
- Audit and run log policy.

### 5.4 Enterprise Settings

Visible:

- Enterprise secret provider.
- Private gateway endpoint.
- Local-only policies.
- Data retention policy.
- Compliance region policy.
- Export and audit controls.

## 6. BYOK Flow

BYOK should be optional and advanced.

Flow:

```text
Settings
  -> Advanced AI
  -> Add Provider Key
  -> Choose provider
  -> Paste key or connect account
  -> Test connection
  -> Save secret reference
  -> Choose where to use it
```

Rules:

- Never show BYOK in novice first-run unless platform-managed AI is unavailable.
- Never store raw keys in Run Logs.
- Test the key before enabling it.
- Show plain-language errors.
- Allow user to remove the key.

## 7. Workspace-Managed Key Flow

For teams:

```text
Admin Settings
  -> AI Providers
  -> Add workspace key
  -> Select allowed model packs
  -> Set monthly budget
  -> Members use simple modes
```

Members should not need to know the provider key.

## 8. Local / Private Setup

Local/private setup should be progressive.

MVP:

- Show `Local / Private` as a future-ready mode if local provider is not configured.
- Explain that no local provider is currently connected.

P1:

- Detect local OpenAI-compatible endpoint.
- Let user test connection.
- Allow local model for private Context Packs.

P2:

- Guided setup for Ollama, LM Studio, or enterprise gateway.

## 9. Mapping To Model Policy

Settings should compile into policy, not special-case logic.

The implementation-facing config shape is defined in `MODEL_PACK_CONFIG_CONTRACT_V1.md`. This document owns the user experience, while that contract owns field names, validation rules, provider preset shape, and routing examples.

```json
{
  "user_mode": "Auto",
  "model_pack": "Starter Auto",
  "auth_mode": "platform_managed",
  "provider_preferences": [],
  "fallback_policy": {
    "allow_cross_provider_fallback": true,
    "allow_cloud_fallback_for_private": false
  },
  "budget": {
    "monthly_limit": 10.0,
    "confirmation_threshold_per_run": 0.25
  }
}
```

## 10. UX Copy Principles

Use simple language:

- "Auto chooses the best model for each task."
- "Economy saves cost for routine work."
- "Deep Thinking may cost more but is better for hard synthesis."
- "Local / Private keeps eligible work on configured private models."

Avoid:

- "context window"
- "tokens"
- "function calling"
- "provider fallback chain"
- "schema-constrained generation"

These terms can appear in advanced settings only.

## 11. MVP Requirements

MVP should include:

- `Auto` as default.
- `Economy`, `Balanced`, `Deep Thinking`, and `Local / Private` modes.
- `Starter Auto` pack.
- Advanced BYOK entry point.
- Monthly usage indicator.
- Provider/model hidden by default.
- Fallback hidden by default but logged.

MVP can defer:

- Full model pack marketplace.
- Guided local runtime setup.
- Enterprise policy console.
- Per-agent visual model binding.
- Community model pack import/export.

## 12. Open Questions

- Should `Balanced` be visible, or should `Auto` cover it for novice users?
- Should the monthly usage indicator show exact cost or simple labels?
- Should model packs be workspace defaults or user preferences?
- Should China Optimized be auto-suggested based on locale or manually selected?
- Should Local / Private appear before a local provider is configured?

