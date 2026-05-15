# Model Routing Policy V1

> Status: draft policy
> Date: 2026-05-09
> Workstream: `feat/ai-agent-layer`
> Related: `AI_AGENT_LAYER_REQUIREMENTS_V1.md`, `MODEL_SWITCHING_PROBLEM_MATRIX.md`, `MODEL_PACK_CONFIG_CONTRACT_V1.md`, `PROVIDER_HEALTH_AND_FALLBACK_POLICY_V1.md`

## 1. Purpose

This document defines how the AI / Agent layer should choose model tiers, providers, and fallback behavior.

The goal is to make model switching flexible for the system and simple for users:

- Users choose a plain-language mode.
- Agents request capabilities.
- Model Policy chooses a provider and model.
- Provider Adapter executes the request.
- Run Log records what actually happened.

Agents should not hardcode raw provider model ids unless an advanced override explicitly requires it.

## 2. Routing Order

Model routing should happen in this order:

1. Privacy policy: is this data allowed to leave the local device or workspace?
2. Task policy: what is the task type and risk level?
3. Capability policy: what model capabilities are required?
4. User mode: `Auto`, `Economy`, `Balanced`, `Deep Thinking`, or `Local / Private`.
5. Budget policy: is the estimated cost allowed?
6. Provider health: is the provider available and reliable now?
7. Fallback policy: if the first choice fails, what alternatives are allowed?

Privacy policy comes before cost and convenience.

## 3. Model Tiers

| Tier | Purpose | Typical Tasks | Notes |
| --- | --- | --- | --- |
| `router_fast` | Fast classification and routing | Task classification, language detection, sensitivity check, retrieval decision | Should be cheap and low-latency |
| `cheap_fast` | Low-cost routine generation | Tags, titles, dedupe, short summaries, relation prefiltering | Should not handle important final synthesis |
| `standard` | Default general work | Research cards, source summaries, ordinary Q&A, inbox triage | Default for most user-visible AI |
| `strong_reasoning` | High-value reasoning | Reflection, deep synthesis, argument analysis, complex writing help | Used selectively due to cost |
| `guardrail` | Policy and boundary checks | Originality checks, privacy checks, confirmation checks | Can be rules plus model |
| `local_private` | Private or offline work | Sensitive notes, enterprise workspaces, local-only projects | Capability may be lower but privacy is higher |

## 4. User Modes

| User Mode | Product Meaning | Routing Behavior |
| --- | --- | --- |
| `Auto` | Recommended default | Product chooses cost-quality balance per task |
| `Economy` | Lower cost and faster routine work | Prefer `router_fast`, `cheap_fast`, and `standard`; ask before `strong_reasoning` |
| `Balanced` | Normal quality/cost tradeoff | Use `standard` by default; escalate important synthesis to `strong_reasoning` |
| `Deep Thinking` | More careful reasoning | Prefer `strong_reasoning` for reflection, synthesis, and complex writing |
| `Local / Private` | Keep work local/private when possible | Prefer `local_private`; cloud fallback requires explicit policy permission |

Novice users should start in `Auto`.

## 5. Agent Defaults

| Agent | Default Tier | Escalates To | Notes |
| --- | --- | --- | --- |
| Task Router Agent | `router_fast` | `standard` | Escalate only if classification confidence is low |
| Context Builder Compression | `cheap_fast` | `standard` | Deterministic retrieval should do most of the work |
| Connection Agent | `cheap_fast` | `standard` | Cheap model generates candidates; standard model ranks or explains |
| Research Agent | `standard` | `strong_reasoning` | Strong model only for cross-source synthesis or high-value topics |
| Reflection Agent | `strong_reasoning` | none by default | User-triggered or high-signal background prompts only |
| Synthesis Agent | `strong_reasoning` | none by default | Requires bounded selected context or project scope |
| Originality Guard Agent | `guardrail` | `standard` | Prefer rules first, model second |
| Scheduled Digest Agent | `standard` | `cheap_fast` or `strong_reasoning` | Use budget and task importance to decide |

## 6. Task Routing Matrix

| Task Type | Default Tier | Allowed Background? | Requires User Confirmation? | Notes |
| --- | --- | --- | --- | --- |
| Classify user request | `router_fast` | Yes | No | No note mutation |
| Decide retrieval need | `router_fast` | Yes | No | Should be cheap and fast |
| Generate tags/title | `cheap_fast` | Yes | No | Output as suggestion |
| Detect duplicate notes | `cheap_fast` | Yes | No | Output as suggestion |
| Relation candidate prefilter | `cheap_fast` | Yes | No | Candidate only |
| Link suggestion explanation | `standard` | Yes | No | Must cite source notes |
| Source summary | `standard` | Yes | No | Store as source-derived artifact |
| Paper/news research card | `standard` | Yes | No, unless expensive | Respect scheduled task budget |
| Cross-source research synthesis | `strong_reasoning` | Limited | Yes if expensive or broad | Use bounded context |
| Reflection prompt | `strong_reasoning` | Limited | No for low-frequency prompt; yes for broad scan | Should not edit permanent notes |
| Multi-note outline | `strong_reasoning` | No by default | Yes | User-triggered work |
| Draft writing assistance | `standard` or `strong_reasoning` | No | Yes before inserting into notes | AI output remains artifact first |
| Originality/provenance check | `guardrail` | Yes | No | Rules plus model as needed |
| Sensitive private note analysis | `local_private` | Depends on policy | Often yes | Cloud fallback disabled by default |

## 7. Capability Gates

A model can only be selected if it satisfies the task's required capabilities.

Capability flags:

- `supports_tool_calling`
- `supports_structured_output`
- `supports_streaming`
- `supports_long_context`
- `supports_json_validation`
- `supports_multimodal_input`
- `supports_embeddings`
- `supports_local_execution`
- `supports_enterprise_data_boundary`

If a task requires structured output and the model cannot provide it reliably:

- Retry with stricter validation if cheap.
- Fallback to a compatible model if policy allows.
- Store an error in Run Log if no fallback is allowed.

## 8. Privacy Gates

Privacy gates must run before provider selection.

Suggested privacy modes:

- `normal`: cloud model allowed under workspace policy.
- `private_project`: cloud model allowed only with explicit user or workspace permission.
- `local_only`: cloud model disabled.
- `enterprise_restricted`: only allow enterprise-approved providers.

The Context Builder should label each Context Pack with a privacy mode. The Model Policy should reject providers that violate that mode.

## 9. Budget Gates

Budget gates should apply at several levels:

- Per run.
- Per scheduled task.
- Per day.
- Per user per month.
- Per workspace per month.
- Per provider when needed.

MVP behavior:

- Cheap routine tasks can run silently within budget.
- Expensive synthesis tasks show a confirmation if they exceed a threshold.
- Scheduled tasks have hard caps and stop when the cap is reached.
- `Economy` mode should avoid `strong_reasoning` unless the user confirms.

## 10. Fallback Policy

Fallback should be explicit and logged.

Provider health-aware fallback behavior is defined in `PROVIDER_HEALTH_AND_FALLBACK_POLICY_V1.md`.

Fallback reasons:

- Provider unavailable.
- Rate limit.
- Timeout.
- Capability mismatch.
- Structured output validation failure.
- Budget constraint.
- Region/network issue.

Fallback order in `Auto`:

1. Same provider, cheaper or equivalent compatible model.
2. Same provider, stronger compatible model if validation failed and budget allows.
3. Aggregated gateway compatible model.
4. Direct fallback provider.
5. Local/private model only if privacy policy and user mode allow.

Fallback order in `Local / Private`:

1. Local/private configured model.
2. Enterprise-approved private provider.
3. Ask user before any cloud fallback.

Fallback should never override `local_only` privacy.

## 11. Platform-Managed vs BYOK

Default novice mode:

```text
platform_managed + Auto
```

Advanced modes:

```text
workspace_managed + selected model pack
byok_advanced + selected provider/model
local_no_key + Local / Private
enterprise_secret + admin policy
```

The product should not ask novice users for API keys during first-run onboarding if platform-managed AI is available.

## 12. Policy Pseudocode

```text
routeModel(task, contextPack, userMode, workspacePolicy):
  privacyMode = classifyPrivacy(contextPack, workspacePolicy)
  if privacyMode blocks cloud:
    return chooseLocalOrEnterpriseModel(task, userMode, workspacePolicy)

  taskProfile = classifyTask(task)
  requiredCapabilities = getRequiredCapabilities(taskProfile)
  targetTier = chooseTier(taskProfile, userMode)

  if estimatedCostExceedsBudget(taskProfile, targetTier):
    targetTier = downgradeOrRequestConfirmation(taskProfile, userMode)

  candidates = findModels(targetTier, requiredCapabilities, workspacePolicy)
  candidates = sortByCostQualityLatencyHealth(candidates)

  if candidates is empty:
    return requestConfigurationOrFail(taskProfile)

  return candidates.first()
```

## 13. MVP Routing Decisions

- Use `Auto` as the default mode.
- Use platform-managed AI as the default auth mode if available.
- Use direct OpenAI integration as one baseline provider.
- Add one OpenAI-compatible aggregated gateway adapter.
- Keep `Local / Private` as a mode even if full local setup ships after MVP.
- Store every routing decision in the Run Log.
- Keep model ids hidden from novice users.
- Allow advanced overrides, but never let overrides bypass privacy policy.
- Treat model packs as compiled policy inputs using `MODEL_PACK_CONFIG_CONTRACT_V1.md`.
- Apply provider health and fallback rules using `PROVIDER_HEALTH_AND_FALLBACK_POLICY_V1.md`.

## 14. Open Questions

- What cost threshold should trigger confirmation in `Auto` and `Balanced`?
- Should `Deep Thinking` always imply stronger model use, or only for specific task types?
- Should relation discovery run fully in background, or only produce candidates after user opt-in?
- Which provider should be the first aggregated gateway adapter?
- Which local runtime should define the first `local_private` capability profile?
- How much provider/model detail should be shown in the run log for novice users?
