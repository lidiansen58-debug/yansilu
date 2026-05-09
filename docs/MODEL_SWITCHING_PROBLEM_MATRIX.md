# Model Switching Problem Matrix

> Status: draft for AI / Agent layer
> Date: 2026-05-09
> Workstream: `feat/ai-agent-layer`
> Related: `AI_AGENT_LAYER_REQUIREMENTS_V1.md`, `MODEL_ROUTING_POLICY_V1.md`

## 1. Purpose

Multi-model switching is not just a provider integration problem. It affects novice onboarding, cost control, privacy, agent reliability, tool execution, output quality, and product trust.

This matrix lists the major problem areas so the product can design a simple user experience on top of a flexible model architecture.

The target product posture is:

> Advanced model flexibility underneath. Extremely simple choices for normal users.

## 2. Listing Method

List model switching problems by layers:

1. User experience: what does the user see?
2. Task routing: which model tier should run which task?
3. Capability matching: can the model do the required work?
4. Provider and gateway reliability: can the request actually run?
5. Cost and budget: can the product afford this run?
6. Privacy and compliance: is this data allowed to leave the device or workspace?
7. Authentication and keys: how does the request get authorized?
8. Evaluation and quality: how do we know the switch did not make results worse?
9. Operations and support: how do we debug failures?

## 3. MVP Principles

- Default to `Auto` for novice users.
- Hide raw provider names, raw model ids, context windows, and token prices from novice flows.
- Treat BYOK as an advanced setting, not the default onboarding path.
- Use platform-managed AI when available.
- Keep task policy inside the product, even if a third-party model gateway is used.
- Never let background agents send private notes to cloud models unless policy allows it.
- Prefer lower-cost models for routing, tagging, deduplication, and candidate generation.
- Use stronger models only for high-value reasoning, synthesis, reflection, and important user-triggered work.
- Record model, provider, task, usage, cost estimate, and fallback behavior for every run.

## 4. Problem Matrix

| Area | Key Question | Impacted System | Risk | MVP Decision | Later Enhancement |
| --- | --- | --- | --- | --- | --- |
| Novice UX | Should users see model names? | Settings, onboarding | High | Show modes: `Auto`, `Economy`, `Balanced`, `Deep Thinking`, `Local / Private` | Advanced model picker for power users |
| Novice UX | How much cost information should be shown? | Billing, run UI | High | Show monthly budget and warnings for expensive tasks | Per-run cost preview and historical spend charts |
| Novice UX | How should failure be explained? | Error UI | Medium | Plain-language error plus one-click fallback when allowed | Provider-specific diagnostics for advanced users |
| Task Routing | Which tasks can use cheap models? | Model Policy | High | Router, tagging, dedupe, relation prefilter, simple summaries | Auto-learn routing from evaluation and user feedback |
| Task Routing | Which tasks need strong models? | Model Policy | High | Reflection, deep synthesis, argument analysis, important writing support | Dynamic escalation based on uncertainty |
| Task Routing | Can users force a stronger model? | Settings, run UI | Medium | Allow `Deep Thinking` mode and per-run upgrade | Per-agent default override |
| Capability Matching | Does the model support tool calling? | Agent Harness, Tool Layer | Critical | Only route tool agents to tool-capable models or use adapter fallback | Tool-use simulation for weaker providers |
| Capability Matching | Does the model support structured output? | AIArtifact creation | High | Validate output with schema and retry/fallback on failure | Provider capability registry with live tests |
| Capability Matching | Does the model support long context? | Context Builder | High | Compress context to bounded Context Packs | Dynamic chunking and hierarchical summarization |
| Capability Matching | Does the model support streaming? | UI, Runner | Low | Streaming optional for MVP | Provider-specific streaming normalizer |
| Capability Matching | Does the model support embeddings? | Retrieval | Medium | Keep embedding provider separately configurable | Multi-embedding strategy by language/domain |
| Provider Access | Should OpenRouter be used? | Model Gateway | Medium | Treat OpenRouter or similar as one adapter, not the architecture | Add self-hosted gateway for enterprise |
| Provider Access | Which providers need direct integration? | Provider Layer | High | Direct OpenAI baseline plus one generic OpenAI-compatible adapter | Direct integrations for strategic domestic/international providers |
| Provider Access | What if a provider is down? | Model Policy, Gateway | High | Fallback if user policy allows and privacy policy permits | Provider health scoring and automatic rerouting |
| Provider Access | What if a region blocks a provider? | Gateway, Settings | High | Region-aware provider configuration | Regional packs such as `China Optimized` |
| Cost | How to avoid surprise bills? | Billing, Scheduler | Critical | Per-user/month and per-task budgets | Predictive cost simulation before large runs |
| Cost | How to control scheduled task spend? | Scheduler | Critical | Hard cap per scheduled task and per period | Adaptive schedules based on usefulness |
| Cost | Should cheap models prefilter work? | Agents | High | Yes, use cheap prefilter before expensive synthesis | Multi-stage pipelines with confidence gates |
| Cost | How to price platform-managed AI? | Billing | Critical | Product-managed credits or included quota | Plan-specific AI allowances |
| Privacy | Can cloud models read private notes? | Context Builder, Policy | Critical | Only if workspace/user policy allows | Per-project privacy modes |
| Privacy | Can background agents send data out? | Scheduler, Policy | Critical | Default deny for sensitive/private spaces | User-approved recurring task scopes |
| Privacy | How to support local/private models? | Provider Layer | High | `Local / Private` mode when configured | Offline mode and enterprise private gateways |
| Authentication | Should novice users bring keys? | Onboarding | Critical | No, use platform-managed AI by default | BYOK prompt only when platform AI unavailable |
| Authentication | How are BYOK keys stored? | Desktop, Cloud, Enterprise | High | Advanced setting; store in secure OS/cloud secret storage | Enterprise secret manager integration |
| Authentication | Can teams share one key? | Workspace settings | High | Workspace-managed keys for teams | Per-team quotas and provider allowlists |
| Quality | How to know a cheaper model is good enough? | Evaluation | High | Maintain task-specific evaluation sets | Continuous provider scoring |
| Quality | Do prompts need per-model variants? | Agent Registry | Medium | Keep prompts mostly model-agnostic; add overrides only when needed | Model-specific prompt templates |
| Quality | What if output quality regresses after fallback? | Run Log, UX | High | Log fallback and mark low-confidence output | User feedback loop and retry with stronger model |
| Operations | How to debug provider failures? | Run Log, Trace | High | Store provider, model, error class, latency, retry, fallback | Admin diagnostics dashboard |
| Operations | How to compare models? | Eval, Analytics | Medium | Manual eval matrix for MVP | Automated A/B and benchmark harness |
| Operations | How to prevent vendor lock-in? | Architecture | High | Stable Provider Adapter interface | Multiple gateways and direct providers |

## 5. P0 Decisions

These decisions should be made before implementation:

- Default novice experience is `platform_managed` plus `Auto`.
- BYOK belongs in advanced settings.
- The product needs a Provider Adapter interface.
- The first model gateway should be an adapter behind the product policy layer.
- Every agent run must record provider, model, task type, usage, estimated cost, and fallback path.
- Cloud/private routing must be governed by privacy policy before model policy.
- Tool-capable agents must only use models or adapters that support tool execution reliably.

## 6. Open Decision Backlog

- Which aggregated gateway should be used first: OpenRouter, LiteLLM, Portkey, or an internal gateway?
- Which domestic providers should be first-class integrations rather than generic compatible endpoints?
- Which local model runtime should power `Local / Private` mode first?
- How should model quality be evaluated for Chinese notes, English papers, and mixed-language research?
- What is the minimum cost warning that is understandable to a novice user?
- Should users be allowed to disable all cloud fallback?
- Should the product keep a public model capability list, an internal one, or both?

