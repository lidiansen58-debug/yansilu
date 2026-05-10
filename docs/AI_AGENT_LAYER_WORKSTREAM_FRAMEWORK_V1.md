# AI / Agent Layer Workstream Framework V1

> Status: next-step independent workstream
> Date: 2026-05-09
> Branch: `feat/ai-agent-layer`
> Worktree: `yansilu-wt/feat-ai-agent-layer`

## 1. Purpose

This workstream exists to develop the AI / Agent layer independently while the main product team keeps focus on the core note-recording experience.

The near-term product priority remains:

- Fast, reliable note capture.
- Stable local note storage.
- Clear note organization.
- Core writing and reading workflow.
- Import/export and basic knowledge management foundations.

The AI / Agent layer should be explored, specified, and prototyped in this branch without blocking the core note MVP.

## 2. Phase Boundary

The AI / Agent layer is a next-step requirement track.

It should not redefine:

- The note editor.
- The core vault model.
- Basic note taxonomy.
- Import pipeline behavior.
- Main MVP interaction flow.

It should define:

- Agent harness architecture.
- OpenAI Agents SDK usage.
- Model routing and provider abstraction.
- Scheduled AI tasks.
- Context management.
- AI artifacts and suggestion objects.
- Provenance and originality boundaries.
- Cost, key, tracing, and usage strategy.

## 3. Worktree Collaboration Model

This branch should remain separate from the active core note work until its contracts are mature.

Recommended flow:

- Core note development continues on the active product branches.
- AI / Agent design and prototypes continue on `feat/ai-agent-layer`.
- Shared contracts are proposed as docs first.
- Only stable contracts are merged back into `master/main`.
- Implementation should not touch core note internals until the tool/API boundary is agreed.

The preferred collaboration pattern is contract-first:

```text
Core Note App
  exposes stable note/search/source/project APIs

AI / Agent Layer
  consumes those APIs through tools and context builders
```

## 4. Current Document Map

Primary AI / Agent documents:

- `docs/AI_AGENT_LAYER_REQUIREMENTS_V1.md`: product and architecture requirements for the AI / Agent layer.
- `docs/AI_AGENT_LAYER_WORKSTREAM_FRAMEWORK_V1.md`: this workstream boundary, phase plan, and collaboration model.
- `docs/AI_AGENT_EVALUATION_AND_ACCEPTANCE_V1.md`: task, model, privacy, cost, scheduled-task, and UX acceptance plan.
- `docs/AI_PRIVACY_PERMISSION_AND_ORIGINALITY_POLICY_V1.md`: privacy, permission, cloud-use, background-agent, and originality guardrail policy.
- `docs/MODEL_SWITCHING_PROBLEM_MATRIX.md`: risks and decisions for multi-model switching.
- `docs/MODEL_ROUTING_POLICY_V1.md`: which tasks use which model tiers and why.
- `docs/MODEL_NEUTRALITY_AND_PORTABILITY_PRINCIPLES.md`: anti-lock-in architecture principles for providers, models, gateways, and deployment modes.
- `docs/MODEL_PACKS_AND_USER_SETTINGS_V1.md`: novice-friendly model modes, model packs, BYOK, team, and enterprise settings.
- `docs/AI_TOOL_CONTRACTS_V1.md`: stable tool boundary between the note app and the Agent layer.
- `docs/CORE_NOTE_APP_INTEGRATION_CONTRACT_V1.md`: minimum API and event boundary needed from the core note app.
- `docs/PROVIDER_ADAPTER_INTERFACE_V1.md`: normalized provider/gateway/local runtime interface for model portability.
- `docs/AI_ARTIFACT_SCHEMA_V1.md`: schemas for research cards, link suggestions, reflection prompts, and synthesis drafts.
- `docs/AI_AGENT_LAYER_STORAGE_SCHEMA_V1.md`: AI-owned storage boundary for artifacts, run logs, context packs, scheduled tasks, and provider settings.
- `docs/AGENT_HARNESS_ARCHITECTURE_V1.md`: runtime, scheduler, tracing, and tool execution architecture.
- `docs/MODEL_PROVIDER_CAPABILITY_MATRIX.md`: provider/model capabilities, cost, region, and tool support.
- `docs/CONTEXT_PACK_SCHEMA_V1.md`: bounded context package schema for agent runs.
- `docs/AGENT_RUN_LOG_SCHEMA_V1.md`: trace, usage, cost, fallback, and tool-call record schema.
- `docs/SCHEDULED_AGENT_TASKS_V1.md`: recurring research, scan, digest, and notification behavior.
- `docs/AI_AGENT_LAYER_MVP_IMPLEMENTATION_PLAN.md`: implementation slices, dependencies, and validation plan.
- `docs/AI_AGENT_IMPLEMENTATION_DISCOVERY_CHECKLIST.md`: codebase discovery checklist before starting implementation.

Relevant existing product documents:

- `docs/THINKING_AND_AI_BOUNDARIES.md`: existing thinking and AI boundary principles.
- `docs/PHASE_3_AI_AGENT_ROLES_AND_PERMISSION_BOUNDARIES.md`: previous phase-level AI role and permission ideas.
- `docs/THOUGHT_DISTILLATION_V1_CONTRACT.md`: existing distillation contract that may inform future context and artifact design.

## 5. Next Documents To Add

The next useful documents for this workstream are:

No additional core planning documents are required before implementation discovery. Add narrower specs only when a concrete implementation question appears.

## 6. Near-Term Decision Questions

Before implementation, this thread should answer:

- Which model gateway strategy is best for MVP: direct OpenAI plus OpenRouter, LiteLLM, Portkey, or internal gateway?
- Which model configuration should be visible to novice users?
- What is the default platform-managed AI experience?
- What data can be sent to cloud models by default?
- What tool contracts does the note app need to expose?
- What does the first Context Pack schema look like?
- What is the minimum run log needed for trust, debugging, and cost visibility?

## 7. Implementation Gate

Do not start broad AI implementation until these are stable enough:

- Core note CRUD/search APIs.
- Source document read APIs.
- Project or topic metadata APIs, if any.
- AI artifact storage boundary.
- Originality/provenance marking boundary.
- Model provider abstraction.
- User key and platform-managed billing decision.

Small prototypes are allowed inside this worktree if they validate the Agent harness or model routing design without coupling to unstable note internals.

## 8. Merge Criteria

This workstream can start merging pieces into `master/main` when:

- The core note MVP is stable enough to expose tool contracts.
- The Agent layer can integrate through APIs rather than internal rewrites.
- The default novice model experience is simple and tested.
- The platform-managed versus BYOK decision is clear.
- AI artifacts are separate from human-authored notes.
- Tracing and usage capture are designed before background agents ship.
