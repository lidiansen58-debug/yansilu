# Provider Health and Fallback Policy V1

> Status: draft implementation policy
> Date: 2026-05-11
> Workstream: `feat/ai-agent-layer`
> Related: `MODEL_ROUTING_POLICY_V1.md`, `PROVIDER_CONFIG_CONTRACT_V1.md`, `PROVIDER_HEALTH_STORE_V1.md`, `PROVIDER_ADAPTER_INTERFACE_V1.md`, `SCHEDULED_AGENT_TASKS_V1.md`

## 1. Purpose

Provider health is the runtime signal that tells Model Policy whether a configured provider is usable right now.

Fallback policy decides whether the system may switch to another model, provider, gateway, or private runtime when the first choice is unavailable, degraded, blocked by policy, or missing a required capability.

The goal is:

- Keep novice users away from provider complexity.
- Avoid silent privacy violations.
- Avoid wasting scheduled task budget on failing providers.
- Keep fallback explicit and logged.
- Preserve model/provider portability without letting gateways own product policy.

Executable implementation and tests:

- `packages/ai-orchestrator/src/provider-health-policy.mjs`
- `packages/ai-orchestrator/src/provider-health-store.mjs`
- `tests/unit/ai-provider-health-policy.test.mjs`

## 2. Health Statuses

| Status | Meaning | User-Triggered Work | Scheduled Work |
| --- | --- | --- | --- |
| `healthy` | Provider is available and within expected latency | Use normally | Use normally |
| `unknown` | No recent health result exists | Allowed as lower-priority fallback | Allowed only if policy has no healthier option |
| `degraded` | Provider is slow, flaky, or partially unavailable | Prefer healthy fallback if allowed | Prefer healthy fallback; otherwise run only if task is still useful |
| `down` | Provider is unavailable, auth-broken, or failing health checks | Fallback if policy allows | Skip task if no allowed fallback exists |

Health status is advisory after privacy and capability gates. It must never override privacy policy.

## 3. Routing Order

Health-aware fallback should run after the route has already decided:

1. Privacy mode.
2. User mode.
3. Model pack.
4. Target model tier.
5. Required capabilities.
6. Budget and confirmation state.
7. Primary provider candidate.

Then Provider Health policy evaluates:

```text
Primary Provider
  -> privacy allowed?
  -> capability allowed?
  -> target tier available?
  -> health usable?
  -> fallback allowed?
  -> confirmation required?
```

## 4. Candidate Eligibility

A provider candidate is eligible only if:

- It does not violate privacy mode.
- It supports the selected model tier.
- It does not explicitly lack required capabilities.
- It is not `down`.
- Its fallback type is allowed by policy.
- Cloud fallback is allowed when the candidate is cloud-based.

Candidate types:

- `primary`: the provider selected by Model Policy.
- `same_provider`: the same provider with another model or endpoint.
- `cross_provider`: another direct provider, gateway, or private runtime.

## 5. Privacy Rules

Privacy has priority over health, fallback, and convenience.

Rules:

- `local_only` can only use local/private providers.
- `Local / Private` cannot silently fall back to cloud.
- Private cloud fallback requires explicit user or workspace policy.
- Scheduled tasks must not prompt for cloud fallback; they should skip and record the reason.
- A healthy cloud provider is still ineligible for local-only context.

## 6. Confirmation Rules

Fallback can be automatic only when policy allows it.

Automatic fallback is allowed when:

- The fallback candidate is privacy-compatible.
- The fallback candidate satisfies required capabilities.
- `allow_same_provider_fallback` or `allow_cross_provider_fallback` allows it.
- `allow_cloud_fallback` allows it for cloud candidates.
- No confirmation rule applies.

Fallback requires confirmation when:

- `requires_confirmation_for_cloud` is true and fallback is cloud-based.
- `requires_confirmation_for_international_fallback` is true and fallback crosses the regional policy boundary.
- The fallback would expose private or sensitive context to a broader provider boundary.

Scheduled tasks should not open interactive confirmation flows. If the only available fallback requires confirmation, the task should be skipped and surfaced as a reviewable status.

## 7. Scheduled Task Rules

Scheduled tasks should be conservative because they run without the user watching.

Rules:

- If primary is healthy, run normally.
- If primary is degraded, prefer a healthy fallback when policy allows.
- If primary is down and no allowed fallback exists, skip the task.
- If fallback requires confirmation, skip the task and create a reviewable notice.
- If all eligible candidates are unknown, the task may run only within budget and privacy limits.
- Scheduled tasks should log health status, fallback decision, and skip reason.

## 8. Run Log Requirements

Every health-aware routing decision should be loggable.

Minimum summary:

```json
{
  "action": "use_primary | use_degraded_primary | fallback | requires_confirmation | skip_scheduled | fail",
  "fallback_used": false,
  "fallback_reason": "none | provider_down | provider_degraded | privacy_blocks_cloud | provider_unavailable",
  "confirmation_required": false,
  "primary_provider_id": "openai_compatible_gateway",
  "selected_provider_id": "platform_managed_openai",
  "selected_model_ref": "platform_managed_openai:standard",
  "trigger": "user_command | background_task | scheduled_task"
}
```

Provider health details should be stored as events or provider health history, not as human note content.

## 9. MVP Decisions

- Primary healthy provider should be used.
- Primary down provider should fall back only when policy allows.
- `local_only` must reject cloud fallback even when cloud provider is healthy.
- Scheduled tasks should skip instead of prompting.
- Fallback candidates must satisfy required capabilities.
- Health policy should remain independent from provider gateways.

## 10. Later Enhancements

- Provider health history table.
- Provider latency scoring by region.
- Automatic quarantine for repeated failures.
- Workspace-level provider quality scores.
- Per-task provider success metrics.
- Admin diagnostics dashboard.
- User-facing plain-language fallback notices.
