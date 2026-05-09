# AI / Agent Layer Requirements V1

> Status: separated requirement track
> Date: 2026-05-09
> Scope: AI and Agent intelligence layer only. This document intentionally stays separate from the core note-taking product requirements.

## 1. Positioning

The product is not just a note app with an AI chat panel. The AI layer should behave like an embedded agent runtime inside the note-taking software.

The note app remains the host system for human-authored notes, local knowledge, reading material, relations, projects, and user workflows. The AI / Agent layer provides perception, context management, scheduled research, reasoning, orchestration, tool execution, cost-aware model routing, provenance tracking, and controlled writeback.

The central product principle is:

> Notes carry the user's original thinking. Agents help the user notice, connect, research, organize, challenge, and extend that thinking, but they do not silently become the author.

## 2. Boundary With Core Note Requirements

This requirement track does not define the basic note editor, vault storage, note taxonomy, file import, markdown behavior, or core notebook UI.

It only defines the intelligence layer that sits around the existing note product:

- Agent runtime and orchestration.
- Task and mode routing.
- Model selection and cost control.
- Context construction.
- Tool calling.
- Scheduled AI tasks.
- AI artifacts and suggestions.
- Provenance and originality boundaries.
- Run logs, traces, usage accounting, and reviewability.

## 3. Core Goals

The AI / Agent layer should support:

- Helping users organize their thinking, including structuring, questioning, and synthesizing notes.
- Reminding users of relationships between current notes, older notes, external sources, and ongoing projects.
- Running scheduled research tasks, such as reading papers, RSS feeds, newsletters, and industry updates.
- Managing task-specific contexts instead of sending the whole note vault to a model.
- Calling different agents and different models for different tasks.
- Switching flexibly across OpenAI models, OpenAI-compatible providers, major Chinese and international commercial models, open-source hosted models, and local or private deployments.
- Saving customer cost by using cheaper models for low-risk or high-volume work and stronger models only when deeper reasoning is needed.
- Keeping AI-generated material separate from original human-authored notes unless the user explicitly accepts or rewrites it.

## 4. OpenAI Agents SDK Direction

The Agent layer should be built on the OpenAI Agents SDK.

The expected reasons are:

- Agents can be configured with task-specific instructions, tools, output types, guardrails, and handoffs.
- Different agents can use different models.
- The runtime can route simple work to lower-cost models and complex work to stronger models.
- Model access can be extended through custom model providers, OpenAI-compatible endpoints, and adapter layers where needed.
- Tracing and usage information can be used by the product harness for observability and customer-facing cost accounting.
- The note product can expose local note/search/writeback capabilities as tools, while the SDK handles agent execution patterns.

The product should avoid hardcoding model choices throughout the application. Model selection should be centralized through a policy layer.

## 5. High-Level Architecture

```text
Note App Host
  -> AI / Agent Harness
      -> Task Router
      -> Context Builder
      -> Agent Registry
      -> Model Policy
      -> Model Provider Layer
      -> Tool Layer
      -> Scheduler
      -> Provenance Layer
      -> Run Log / Trace / Usage Store
      -> AI Artifact Writeback
```

## 6. Agent Harness

The harness is the control layer around the Agents SDK.

It should:

- Receive tasks from user actions, editor context, background jobs, and scheduled tasks.
- Determine task type, risk level, expected value, and required context.
- Build a bounded context pack for the selected task.
- Select the right agent and model policy.
- Execute the agent run.
- Track tool calls, model usage, context inputs, generated outputs, and failures.
- Store results as AI artifacts, suggestions, cards, or queued actions.
- Require explicit user action before AI output becomes original note content.

The harness should be treated as product infrastructure, not just API glue.

## 7. Agent Registry

Each agent should be registered declaratively where possible.

An agent definition should include:

- Agent id.
- Purpose.
- Default model tier.
- Allowed tools.
- Context budget.
- Output schema.
- Guardrails.
- Whether it can run automatically.
- Whether it requires user confirmation before tool execution or writeback.
- Usage and budget limits.

Example:

```yaml
connection_agent:
  purpose: "Discover potential relationships among notes and sources."
  model_tier: "low_or_mid"
  tools:
    - search_notes
    - read_note
    - create_link_suggestion
  output_type: "LinkSuggestion[]"
  max_context_notes: 12
  can_run_in_background: true
  can_write_human_note: false
```

## 8. Model Policy

Model choice should be based on task type, user plan, budget, latency sensitivity, and risk.

Suggested model tiers:

- `cheap_fast`: classification, routing, deduplication, lightweight tagging, title suggestions, relation candidate prefiltering.
- `standard`: paper/news summaries, research cards, ordinary note Q&A, simple synthesis, inbox triage.
- `strong_reasoning`: reflection, deep synthesis, cross-note argument analysis, project-level reasoning, complex writing support.
- `guardrail`: originality checks, permission checks, source requirement checks, user-confirmation checks.

The Model Policy should support:

- Per-user monthly budget.
- Per-workspace budget.
- Per-task maximum cost.
- Per-agent default tier.
- Emergency fallback to cheaper models.
- Manual override for power users.
- Provider fallback when a model is unavailable, slow, too expensive, or blocked by region/network constraints.
- Usage reporting by task, agent, model tier, and workspace.

### 8.1 Model Provider Layer

The product should separate "what the task needs" from "which exact provider and model serves it."

This layer should allow flexible switching among:

- OpenAI models.
- OpenAI-compatible API providers.
- Major Chinese commercial model providers.
- Major international commercial model providers.
- Hosted open-source models.
- Local, private, or enterprise-hosted open-source deployments.

The provider layer should define:

- Provider id.
- Provider display name.
- Endpoint type: native SDK, OpenAI-compatible API, LiteLLM/Any-LLM style adapter, local gateway, or enterprise gateway.
- Supported model ids.
- Capability metadata: reasoning, long context, tool calling, structured output, embeddings, multimodal input, streaming.
- Cost metadata: input token cost, output token cost, cached input cost if available, and free/local labels.
- Latency and reliability metadata.
- Region or compliance metadata when needed.
- Authentication mode: platform key, user BYOK, workspace key, local no-key model, or enterprise secret.
- Default use cases.
- Whether the provider is shown to novice users, power users, or admins only.

The Agent Harness should request model capabilities from the Model Policy. The Model Policy should choose a concrete provider and model. Agents should not depend directly on provider-specific model strings unless explicitly configured by an advanced user or admin.

### 8.2 Simple Model Switching UX

Most users should not need to understand provider names, model ids, token prices, or context windows.

The default user experience should expose simple choices:

- `Auto`: recommended default. The system chooses the best cost-quality model for each task.
- `Economy`: lower cost and faster responses for routine work.
- `Balanced`: default quality/cost tradeoff.
- `Deep Thinking`: stronger reasoning for important synthesis or reflection.
- `Local / Private`: use a configured local or enterprise model when privacy is prioritized.

Advanced settings can expose more detail:

- Preferred provider.
- Preferred model per task type.
- BYOK setup.
- Monthly budget.
- Maximum cost per run.
- Whether to allow fallback to another provider.
- Whether to prefer domestic providers, international providers, local models, or platform defaults.

The product should hide complexity by default, but remain configurable for power users and enterprise deployments.

### 8.3 Model Packs

For novice users, model switching should be packaged as presets rather than raw configuration.

Suggested packs:

- `Starter Auto`: platform-managed keys, automatic model routing, conservative budget.
- `Low Cost Research`: cheap routing and summarization, stronger models only for final synthesis.
- `Deep Work`: stronger reasoning for reflection and synthesis, with visible cost warnings.
- `Privacy First`: local/private provider first, cloud fallback only after confirmation.
- `China Optimized`: domestic providers first, with international fallback only if allowed.
- `Global Optimized`: international providers first, with regional fallback if unavailable.

Each pack should map to Model Policy rules internally. Users select an intent; the system translates it into provider, model, budget, fallback, and permission rules.

### 8.4 Configuration Levels

The product should support three configuration levels:

- `Novice`: one default mode selector and a monthly budget indicator.
- `Power User`: choose model packs, BYOK, and per-task preferences.
- `Admin / Enterprise`: provider allowlist, secret management, compliance, audit logs, and workspace-wide budget policy.

The default onboarding should only ask users to pick between platform-managed AI and BYOK if billing or deployment requires it. All other settings should have safe defaults.

## 9. Initial Agent Types

### 9.1 Task Router Agent

Classifies incoming requests and background triggers.

Responsibilities:

- Identify task type.
- Estimate complexity and risk.
- Decide whether retrieval is needed.
- Select candidate agent.
- Select model tier or ask the Model Policy for one.

This should usually run on a cheap model.

### 9.2 Context Builder

The Context Builder may combine deterministic retrieval and model-assisted compression.

Responsibilities:

- Include the current note when relevant.
- Include user-selected notes.
- Retrieve semantically related notes.
- Respect graph links, tags, projects, and recency.
- Include relevant external source material.
- Compress context into a bounded Context Pack.
- Record exactly which notes and sources were used.

The model should never receive the entire vault by default.

### 9.3 Connection Agent

Finds relationships among notes, source documents, and user projects.

Possible outputs:

- Link suggestions.
- Conflict suggestions.
- Duplicate or overlapping concept suggestions.
- "This idea appeared before" reminders.
- Emerging topic clusters.

It should output suggestions, not modify the user's original notes.

### 9.4 Research Agent

Handles scheduled or user-triggered reading of papers, newsletters, RSS feeds, websites, and other external information.

Possible outputs:

- Research cards.
- Source summaries.
- Key claims and evidence.
- Relevance to existing notes.
- Suggested follow-up questions.
- Suggested links to existing notes.

Research outputs should enter an AI inbox or source inbox first.

### 9.5 Reflection Agent

Helps the user think more deeply.

Possible outputs:

- Questions worth answering.
- Missing assumptions.
- Tensions between notes.
- Places where the user has collected material but not formed a judgment.
- Ideas that are recurring enough to become a standalone theme.

This agent should use a stronger reasoning model when the task is high value.

### 9.6 Synthesis Agent

Synthesizes multiple notes and source materials.

Possible outputs:

- Outlines.
- Argument maps.
- Project summaries.
- Draft structures.
- Decision records.
- Topic overviews.

This agent should be cost-aware and should usually require a bounded selected context or a clearly scoped project.

### 9.7 Originality Guard Agent

Protects the boundary between human-authored notes and AI-generated material.

Responsibilities:

- Check whether AI output is being inserted into a human-authored note.
- Require user confirmation before AI material is promoted.
- Ensure source-derived claims keep references.
- Mark AI-generated content as AI-generated until the user accepts or rewrites it.
- Prevent background agents from silently changing original notes.

## 10. Scheduled Tasks

The AI layer should support scheduled tasks independent of manual chat.

Examples:

- Daily or weekly paper reading.
- RSS or newsletter monitoring.
- Keyword and topic tracking.
- New-source relevance checks against existing notes.
- Periodic connection discovery.
- Periodic reflection prompts for long-running themes.
- Project status digests.

Scheduled task outputs should default to AI artifacts or inbox items. They should not directly edit human notes.

Each scheduled task should define:

- Trigger schedule.
- Source scope.
- Agent used.
- Model budget.
- Output destination.
- Maximum number of sources per run.
- Failure and retry policy.
- User notification policy.

## 11. Tool Layer

The note app should expose internal capabilities to agents as tools.

Initial tool categories:

- `search_notes`: search by text, semantic similarity, tags, links, projects, and recency.
- `read_note`: read full or partial note content.
- `read_source_doc`: read external documents, papers, webpages, PDFs, or imported source cards.
- `create_ai_artifact`: create AI-generated suggestions, summaries, questions, or draft structures.
- `create_link_suggestion`: create a candidate relation between notes or sources.
- `create_research_card`: create a source-derived research artifact.
- `list_projects`: inspect active projects or themes.
- `get_user_preferences`: read user-approved preferences for writing, research, or notification style.
- `request_user_confirmation`: ask before sensitive writeback or expensive runs.

Tools that mutate original notes should be excluded from background agents by default.

## 12. Provenance and Originality Rules

All AI outputs should carry provenance.

Content origin categories:

- `human_authored`: written by the user.
- `ai_generated`: generated by an agent.
- `source_derived`: derived from external material.
- `user_accepted`: AI-generated or source-derived content explicitly accepted by the user.
- `user_rewritten`: content originally assisted by AI but rewritten by the user.

Rules:

- Agents cannot silently modify human-authored notes.
- AI-generated content should remain visibly separate until accepted.
- External claims should preserve source links or source ids.
- User acceptance should be stored as an explicit decision event.
- The system should know whether a note, paragraph, block, or artifact is human-authored, AI-generated, source-derived, or user-accepted.

## 13. AI Artifacts

Agents should primarily produce AI artifacts rather than note edits.

Initial artifact types:

- `ResearchCard`
- `ReflectionPrompt`
- `LinkSuggestion`
- `ConflictSuggestion`
- `SynthesisDraft`
- `OutlineDraft`
- `QuestionCard`
- `SourceSummary`
- `ProjectDigest`

Common fields:

- id.
- artifact type.
- created by agent id.
- model used.
- source note ids.
- source document ids.
- prompt or task id.
- confidence or usefulness score.
- status: pending, accepted, ignored, archived, revised.
- created at.
- user decision history.

## 14. Run Log, Trace, and Usage

Every agent run should be observable.

The system should store:

- Run id.
- Trigger source.
- Agent id.
- Model used.
- Context Pack id.
- Tools called.
- Sources read.
- AI artifacts created.
- Token usage.
- Estimated cost.
- Latency.
- Errors and retries.
- User decisions after the run.

This enables:

- Debugging.
- Trust and transparency.
- Cost accounting.
- Product analytics.
- Future personalization.

## 15. MVP Scope

Recommended AI / Agent layer MVP:

- OpenAI Agents SDK based harness.
- Agent Registry.
- Model Policy with at least three model tiers.
- Model Provider Layer with at least OpenAI plus one OpenAI-compatible provider adapter.
- Simple user-facing model modes: Auto, Economy, Balanced, Deep Thinking, and Local / Private.
- At least one novice-friendly model pack, with raw model ids hidden by default.
- Context Builder for current note plus related notes.
- AIArtifact storage separate from human notes.
- Run Log with model usage and source tracking.
- Connection Agent for link suggestions.
- Research Agent for scheduled source reading.
- Reflection Agent for user-triggered deeper thinking.
- Originality Guard rules for writeback boundaries.

Out of scope for this separate track:

- Redesigning the note editor.
- Reworking the full note taxonomy.
- Import pipeline details.
- Core vault storage behavior unless needed as an agent tool contract.

## 16. Open Questions

- Should scheduled research run locally, in cloud, or both?
- Should users bring their own OpenAI key, use platform billing, or support both?
- Which providers should ship as first-class integrations versus generic OpenAI-compatible endpoints?
- Which Chinese commercial models should be included in the first provider pack?
- Which open-source hosted or local model runtimes should be supported in the first privacy-focused pack?
- Should novice users ever see provider/model names, or only mode names such as Auto and Deep Thinking?
- How granular should authorship provenance be: note-level, block-level, paragraph-level, or token/span-level?
- What tasks should be allowed in background mode without user confirmation?
- What is the default monthly AI budget for each customer plan?
- Should power users be allowed to bind specific models to specific agents?
- How much of the trace should be visible to normal users versus developer/admin views?
